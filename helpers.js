const Long = require('mongodb').Long;

module.exports = {
	getUserPronouns(userID, dbo, callback) {
		dbo.collection('pronounsList').find({ _id: Long.fromString(userID) }).toArray((err, result) => {
			if (err) return console.log(err);
			const pronounType = result.length ? result.shift().pronounType : null;
			if (pronounType) {
				dbo.collection('pronounTypes').find({ type: pronounType }).toArray((err, results) => {
					if (err) console.log(err);
					const nouns = results.length ? results.shift().nouns : null;
					if (nouns) {
						callback(nouns);
					}
					else { callback([ 'they', 'them' ]); }
				});
			}
			else {
				callback([ 'they', 'them' ]);
			}

		});
	},
	capitalize(word) {
		if (word.length > 1) return word.charAt(0).toUpperCase() + word.substr(1);
		return word.toUpperCase();
	},
};