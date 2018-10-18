const fs = require('fs');
const Discord = require('discord.js');
const { MongoClient, Long } = require('mongodb');
const { prefix, token, stringResources, defaultCooldown, mongoDB, channels } = require('./config.json');
const cron = require('node-cron');
const { getUserAge, getFormattedDate, getUserPronouns, capitalize } = require('./helpers');

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

client.on('ready', () => {
	console.log('Bot ready!');
	client.user.setActivity(`type ${prefix}help for commands`);
	
	checkBirthdays();
	cron.schedule('* 12 * * *', () => {
		checkBirthdays();
	});
});

client.on('message', message => {
	if (!message.content.startsWith(prefix) && (message.mentions.users.first() && message.mentions.users.first().id !== client.user.id) || message.author.bot) return;
	const args = message.content.slice(prefix.length).split(/ +/);
	let commandName = args.shift().toLowerCase();

	// if this command was called by mention instead of command prefix then we need to shift again to remove the mention
	if (!message.content.startsWith(prefix)) commandName = args.shift().toLowerCase();

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
			if (getFormattedDate(date) === getFormattedDate(tomorrow)) {
				birthdays.push(person);
				
			}
		});

		let counter = 0;

		birthdays.forEach((person) => {
			getUserPronouns(person._id, dbObject, (pronouns) => {
				counter++;
				const id = person._id.toString();
				singleMessage = `@everyone ${channel.guild.members.get(id)}'s birthday is **tomorrow!** :birthday: ${capitalize(pronouns[0])} will be ${getUserAge(new Date(person.birthday))} years old! Be sure to wish ${pronouns[1]} a happy birthday when the time comes!`;
				bulkMessage += `${channel.guild.members.get(id)} will be ${getUserAge(new Date(person.birthday))} years old!\n`;
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