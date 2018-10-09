const { prefix } = require('../config.json');
const Long = require('mongodb').Long;


module.exports = {
	name: 'pronouns',
	description: 'This command allows you to set your preferred pronouns. I\'ll remember them and only refer to you using those pronouns!',
	usage: '',
	requiresMongod: true,
	execute(message, args, dbo) {
		if (!args.length) {
			this.checkPronouns(message, dbo);
		}
		else {
			this.setPronouns(message, args, dbo);
		}
	},
	checkPronouns(message, dbo) {
		const userID = Long.fromString(message.author.id);
		let pronounType;
		dbo.collection('pronounsList').find({ _id: userID }).toArray((err, result) => {
			pronounType = result.shift().pronounType;
			if (pronounType) {
				dbo.collection('pronounTypes').find({ type: pronounType }).toArray((err, results) => {
					if (err) console.log(err);
					const nouns = results.shift().nouns;
					return message.reply(`You currently use ${nouns[0]}/${nouns[1]} pronouns!`);
				});
			}
			else {
				return message.reply(`I don't know your pronouns! You can set them by running this command again. Run \`${prefix}help pronouns\` for more info.`);
			}

		});
	},
	setPronouns(message, args, dbo) {
		const pronoun = args[0];
		const name = (message.member.nickname) ? message.author.member.nickname : message.author.name;
		if (pronoun === 'he' || pronoun === 'she' || pronoun === 'they') {
			dbo.collection('pronounsList').save({ _id: Long.fromString(message.author.id), 'name': name, pronounType: pronoun },
				(err) => { if (err) console.log(err); this.replyWithNewPronons(message, pronoun, dbo); });
		}
		else {
			return message.reply('I\'m sorry, I don\'t think I know that pronoun set. Maybe try asking if it can be added!');
		}
	},
	replyWithNewPronons(message, pronoun, dbo) {
		dbo.collection('pronounTypes').find({ type: pronoun }).toArray((err, res) => {
			if (err) console.log(err);
			const pronouns = res.shift().nouns;
			return message.reply(`Alright, I will only refer to you using ${pronouns[0]}/${pronouns[1]} pronouns! :sparkling_heart:`);
		});
	},
};