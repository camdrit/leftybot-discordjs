const { getUserPronouns } = require('../helpers');
const format = require('string-format');
const { Long } = require('mongodb');

module.exports = {
    name: 'validate',
    description: 'Everyone likes to have something nice said about them!',
    usage: 'name_of_person',
    args: true,
    requiresMongod: true,
    execute(message, args, dbo) {
        dbo.collection('responses').find({ type: 'validate' }).toArray((err, res) => {
            if (err) {
                console.log('err');
                return message.reply('mrrp?');
            }

            if (res.length <= 0) {
                this.seedValidateResponses(message, args, dbo).then(this.execute(message, args, dbo));
                return;
            }

            const responses = res.shift().responses;
            const response = responses[Math.floor(Math.random()*responses.length)];

            // Having issues with fetchMembers...
            const mentionedUser = message.guild.members.find(user => user.displayName.toLowerCase() === args[0].toLowerCase() || user.user.username.toLowerCase() === args[0].toLowerCase());
            const id = mentionedUser ? mentionedUser.user.id : null;

            if (!id) return message.reply('mrrp..?');

            dbo.collection('pronounsList').find({ _id: Long.fromString(id) }).toArray((err, res) => {
                if (err) {
                    console.log(err);
                    return message.reply('mrrp..?');
                }

                let pluralForm;
                let pronouns;

                if (res.length) {
                    getUserPronouns(id, dbo, (res) => {
                        pronouns = res;
                        pluralForm = pronouns[0] === 'they' ? 're' : 's';
                        return message.channel.send(format(response, mentionedUser.displayName, pronouns[0], pronouns[1], pluralForm));
                    });
                }
                else {
                    pronouns = [ 'they', 'them' ];
                    pluralForm = 're';
                    return message.channel.send(format(response, mentionedUser.displayName, pronouns[0], pronouns[1], pluralForm));
                }
            });
        });
    },
    async seedValidateResponses(message, args, dbo) {
        let responses = [
            "I love {0}. {1}'{3} cute. So wonderful.",
            "{0} is a strong gamer! Amazing gamer!",
            "{0} :clap: is :clap: valid! :clap:",
            "{0} is an amazing, hard-working gamer who deserves your love and support. Some days may be hard for {2}, but {1}'{3} trying and that's all that matters.",
            "I once heard that {0} saved the world from evil one time. I don't know if that's true but {1}'{3} really cool anyway so it doesn't matter."
        ];
        return dbo.collection('responses').save({ type: 'validate', responses: responses });
    },
}