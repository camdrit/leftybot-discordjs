const fs = require('fs');
const Discord = require('discord.js');
const { MongoClient, Long } = require('mongodb');
const SpotifyWebApi = require('spotify-web-api-node');
const cron = require('node-cron');
const helpers = require('./helpers');
const { prefix, token, stringResources, defaultCooldown, mongoDB, channels, spotifyConfig } = require('./config.json');

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

const URL = `mongodb://${mongoDB.host}:${mongoDB.port}/${mongoDB.db}`;
let dbObject, mongoClient;

MongoClient.connect(URL, { useNewUrlParser: true }, (err, res) => {
	if (err) {
		console.error(err);
	}
	dbObject = res.db(mongoDB.db);
	console.log('Database connection opened.');
	mongoClient = res;
	
});

const spotifyWebApi = spotifyConfig.spotifyEnabled ? new SpotifyWebApi({
	clientId: spotifyConfig.clientID,
	clientSecret: spotifyConfig.clientSecret,
	redirectUri: spotifyConfig.redirectUri
}) : null;

client.on('ready', () => {
	console.log('Bot ready!');
	client.user.setActivity(`type ${prefix}help for commands`);
	
	checkBirthdays();
	cron.schedule('0 12 * * *', () => {
		checkBirthdays();
	});

	if (spotifyWebApi) helpers.getSpotifyAuthorization(spotifyWebApi);
});

client.on('message', message => {
	if (spotifyWebApi && message.channel.name === channels.spotifyWatch && message.content.indexOf('open.spotify.com') !== -1 && message.content.indexOf('!ignore') === -1) parseSpotifyLink(message);
	else parseCommand(message);
});

client.login(token);

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

function cleanup() {
	mongoClient.close(() => {
		console.log('Closing database connection.');
		client.destroy().then(process.exit(0));
	});
}

function checkBirthdays() {
	console.log('Checking birthdays...');
	dbObject.collection('birthdaysList').find().toArray((err, res) => {
		if (err) console.error('error checking birthdays!');

		const channel = client.channels.find(ch => ch.name === channels.birthdayAnnouncements);
		let totalUsers = 0;
		let singleMessage = "";
		let bulkMessage = "@everyone :birthday: Birthday role call! These lovely gamers have birthdays **tomorrow**:\n\n";

		const today = new Date();
		const tomorrow = new Date();
		tomorrow.setDate(today.getDate() + 1);
		let birthdays = [];

		res.forEach((person) => {
			const date = new Date(person.birthday);
			if (helpers.getFormattedDate(date) === helpers.getFormattedDate(tomorrow)) {
				birthdays.push(person);
				
			}
		});

		let counter = 0;

		birthdays.forEach((person) => {
			helpers.getUserPronouns(person._id, dbObject, (pronouns) => {
				counter++;
				const id = person._id.toString();
				singleMessage = `@everyone ${channel.guild.members.get(id)}'s birthday is **tomorrow!** :birthday: ${helpers.capitalize(pronouns[0])} will be ${helpers.getUserAge(new Date(person.birthday))} years old! Be sure to wish ${pronouns[1]} a happy birthday when the time comes!`;
				bulkMessage += `${channel.guild.members.get(id)} will be ${helpers.getUserAge(new Date(person.birthday))} years old!\n`;
				if (counter === birthdays.length) {
					if (birthdays.length === 1) channel.send(singleMessage);
					else {
						bulkMessage += '\n Let\'s all remember to wish these gamers a happy birthday **tomorrow!** :confetti_ball:';
						channel.send(bulkMessage);
					}
				}
			});
		});
	});
}

function parseCommand(message) {
	const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|\\${prefix})\\s*`);
	if (!prefixRegex.test(message.content)) return;

	const [, matchedPrefix] = message.content.match(prefixRegex);
	const args = message.content.slice(matchedPrefix.length).trim().split(/ +/);
	const commandName = args.shift();

	if (!client.commands.has(commandName)) return;

	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if (command.args && !args.length) {
		let reply = `${message.author} ${stringResources.errors.NoArgumentsFoundError}`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		}

		return message.channel.send(reply);
	}

	if (command.guildOnly && message.channel.type !== 'text') {
		return message.reply(stringResources.errors.GuildOnlyCommandsError);
	}

	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || defaultCooldown) * 1000;

	if (!timestamps.has(message.author.id)) {
		timestamps.set(message.author.id, now);
		setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
	}
	else {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`Please wait ${timeLeft.toFixed(1)} more seconds(s) before reusing the \`${command.name}\` command.`);
		}

		timestamps.set(message.author.id, now);
		setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
	}

	try {
		if (command.requiresMongod) { command.execute(message, args, dbObject); }
		else { command.execute(message, args); }
	}
	catch (error) {
		console.error(error);
		message.reply(stringResources.errors.GenericExceptionError);
	}
}

function parseSpotifyLink(message) {
	let type = message.content.indexOf('track') !== -1 ? 'track' : 'album';
	const track = message.content.split(`https://open.spotify.com/${type}/`)[1].split('?')[0];
	
	if (type === 'album') {
		spotifyWebApi.getAlbum(track).then((data) => {
			const tracks = data.body.tracks.items.map((t) => { return t.id });
			helpers.checkForDuplicateTracks(tracks, dbObject, (returnedTracks, status) => {
				console.log(status);
				if (returnedTracks) helpers.addSongsToSpotifyPlaylist(spotifyWebApi, returnedTracks, message);
			});
		});
	}
	else helpers.checkForDuplicateTracks(track, dbObject, (returnedTracks, status) => {
		console.log(status);
		if (returnedTracks) helpers.addSongsToSpotifyPlaylist(spotifyWebApi, returnedTracks, message);
	});
}

function asyncWait(timer) {
	return new Promise(resolve => {
		timer = timer || 2000;
		setTimeout(() => resolve(), timer);
	});
}

async function callWhenReady(func, timer, condition, ...args) {
	while (!condition) await asyncWait(timer);
	func(args);
}