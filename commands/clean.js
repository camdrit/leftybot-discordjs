const { prefix } = require('../config.json');

module.exports = {
    name: 'clean',
    description: 'Deletes up to 100 messages that meet the criteria of being directed towards the bot or are authored by the bot.',
    aliases: ['purge'],
    args: true,
    usage: 'number',
    cooldown: 5,
    execute(message, args) {
        if (message.member.hasPermission("MANAGE_MESSAGES")) {
            let counter = 0;
            message.channel.fetchMessages({ limit: args[0] })
                .then(messages => {
                    let filtered = messages.filter(message => message.content.startsWith(prefix) || message.author.bot);
                    filtered.forEach(message => {
                        message.delete();
                        counter++;
                    });
                    return message.channel.send(`Deleting ${counter} messages.`).then(msg => msg.delete(1000));
                });
        }
        
    }
}