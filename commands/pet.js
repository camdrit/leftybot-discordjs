module.exports = {
	name: 'pet',
	description: 'Gimmie some lovin\' please!',
	requiresMongod: true,
	execute(message, args, dbo) {
		dbo.collection('responses').find({ type: 'pet' }).toArray((err, result) => {
			if (err) {
				console.log(err);
				return message.channel.send('mrrp..?');
			}

			if (result.length <= 0) {
				this.seedPetResponses(message, args, dbo);
				return;
			}

			const responses = result[0].responses;

			return message.channel.send(responses[Math.floor(Math.random() * responses.length)]);
		});
	},
	seedPetResponses(message, args, dbo) {
		let responses = [
			"mrrrp.",
			"mmrrrow!",
			"*purrs*",
			"*bites you*",
			"*sits on your hand*",
			"mrrreow?",
			"mrrreoow!",
			"*chirps*",
			"*rolls over*",
			"*ignores you*",
			"*glares*",
			"meow...",
			"*rubs cheek on hand*"
		];
		dbo.collection('responses').save({ type: 'pet', responses: responses}).then(this.execute(message, args, dbo));
	}
};