const Long = require('mongodb').Long;
const { getUserPronouns, capitalize } = require('../helpers.js');


module.exports = {
	name: 'birthday',
	description: 'You can tell me what your birthday is and I\'ll remind everyone a day before!',
	usage: 'm/d/yy',
	args: true,
	requiresMongod: true,
	execute(message, args, dbo) {
		const today = new Date();
		const tomorrow = new Date();
		tomorrow.setDate(today.getDate() + 1);
		const parsedDate = new Date(args[0]);
		const name = (message.member.nickname) ? message.member.nickname : message.author.username;
		getUserPronouns(message.author.id, dbo, (pronouns) => {
			const adjective = pronouns[0] === 'they' ? 'are' : 'is';
			if (parsedDate.toDateString() === 'Invalid Date') {
				return message.reply(`That wasn't a valid date! Try ${this.usage}`);
			}
			else {
				dbo.collection('birthdaysList').save({ _id: Long.fromString(message.author.id), 'name': name, birthday: parsedDate.toLocaleDateString() },
					(err) => {
						console.log(`Setting birthday for user ${name} <${message.author.id}>`);
						if (err) return console.log(err);
						if (this.getFormattedDate(parsedDate) == this.getFormattedDate(today)) {
							return message.channel.send(`Ok, so your birthday is **${parsedDate.toLocaleDateString()}**? I'll remember that! Wait...whoa! That means your birthday is today! Hey @everyone it's ${message.author}'s birthday today! ${capitalize(pronouns[0])} ${adjective} ${this.getUserAge(parsedDate)} years old today! :birthday:`);
						}
						else if (this.getFormattedDate(parsedDate) == this.getFormattedDate(tomorrow)) {
							return message.channel.send(`Ok, so your birthday is **${parsedDate.toLocaleDateString()}**? I'll remember that! Wait...whoa! That means your birthday is tomorrow! Hey @everyone it's ${message.author}'s birthday tomorrow! ${capitalize(pronouns[0])} will be ${this.getUserAge(parsedDate)} years old! :birthday: Let's all wish ${pronouns[1]} a happy birthday when the time comes!`);
						}
						else {
							return message.channel.send(`Ok, so your birthday is **${parsedDate.toDateString()}**? I'll remember that!`);
						}
					});
			}
		});
	},
	getUserAge(date) {
		const now = new Date();
		return now.getFullYear() - date.getFullYear();
	},
	getFormattedDate(date) {
		return date.getMonth() + '/' + date.getDate();
	},
};