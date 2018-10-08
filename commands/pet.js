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

			const responses = result[0].responses;

			return message.channel.send(responses[Math.floor(Math.random() * responses.length)]);
		});
	},
};