const Discord = require('discord.js');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const client = new Discord.Client();

client.on('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
	if (message.content === '!ping') {
		message.channel.send('Pong.');
	}
});

client.login(process.env.DISCORD_BOT_TOKEN);