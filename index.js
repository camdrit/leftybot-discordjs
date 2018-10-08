const fs = require('fs');
const Discord = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const { prefix, token, stringResources, defaultCooldown, mongoDB } = require('./config.json');

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

const URL = `${mongoDB.host}:${mongoDB.port}/${mongoDB.db}`;

client.on('ready', () => {
	console.log('Bot ready!');
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
		if (command.requiresMongod) {
			MongoClient.connect(URL, { useNewUrlParser: true }, (err, db) => {
				if (err) {
					console.error(err);
					message.reply(stringResources.errors.GenericExceptionError);
				}
				const dbo = db.db(mongoDB.db);
				command.execute(message, args, dbo);
				db.close();
			});
		}
		else { command.execute(message, args); }
	}
	catch (error) {
		console.error(error);
		message.reply(stringResources.errors.GenericExceptionError);
	}
});

client.login(token);