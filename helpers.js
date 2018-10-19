const Long = require('mongodb').Long;
const { spotifyConfig } = require('./config.json');
const express = require('express');

module.exports = {
	getUserPronouns(userID, dbo, callback) {
		let targetID = userID.constructor.name == "Long" ? userID : Long.fromString(userID);
		dbo.collection('pronounsList').find({ _id: targetID }).toArray((err, result) => {
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
	getFormattedDate(date) {
		return date.getMonth() + '/' + date.getDate();
	},
	getUserAge(date) {
		const now = new Date();
		return now.getFullYear() - date.getFullYear();
	},
	getSpotifyAuthorization(spotifyApi, callback, ...args) {
		if (!spotifyApi.getAccessToken()) {
			const authorizeURL = spotifyApi.createAuthorizeURL(["playlist-read-private", "playlist-modify-private", "playlist-modify-public"]);
			let accessCode;
			console.log(`Lefty is requesting authorization via the Spotify Web Api for write access to a playlist. Please open this link in your browser and approve or deny the request:\n${authorizeURL}`);
			const tempServer = express();
			tempServer.get('/', function(req, res) {
				res.send('You may now close this page.');
				accessCode = req.query.code;
				if (accessCode) spotifyApi.authorizationCodeGrant(accessCode).then(
					(data) => {
						console.log(`Spotify Api authorization granted. The token expires in ${data.body['expires_in'] / 60} minute(s)`);
						spotifyApi.setAccessToken(data.body['access_token']);
						spotifyApi.setRefreshToken(data.body['refresh_token']);
						if (callback) callback(args);
					},
					(error) => { console.log(`There was an error when attempting to retrieve the Spotify Api authorization: ${error}`); }
				)
				closeThis.close();
			});
			const closeThis = tempServer.listen(8000, () => {
				console.log('Waiting for Spotify Api authorization...');
			});
		}
	},
	addSongsToSpotifyPlaylist(spotifyApi, tracks, message) {
		spotifyApi.addTracksToPlaylist(spotifyConfig.targetPlaylist, tracks).then(
			(data) => {
				const emoji = message.guild.emojis.find( emo => emo.name === 'lefty');
				message.react(emoji);
				console.log(`Spotify Web Api: Insertion successful.`);
			},
			(error) => {
				console.log(`There was an error when trying to add track(s) to the playlist: ${error}`);
				if (error.message === 'Unauthorized') {
					if (spotifyApi.getAccessToken()) {
						spotifyApi.refreshAccessToken().then(
							(data) => {
								spotifyApi.setAccessToken(data.body['access_token']);
								this.addSongsToSpotifyPlaylist(spotifyApi, tracks, message);
							}
						)
					} else {
						
						this.getSpotifyAuthorization(spotifyApi, this.addSongsToSpotifyPlaylist, spotifyApi, tracks, message);
					}
				}
			}
		)
	},
	async checkForDuplicateTracks(tracks, dbo, callback) {
		if (Array.isArray(tracks)) {
			let counter = 0;
			const originalLength = tracks.length;
			let message = `Adding album to playlist.`;
			tracks.forEach((track, index, object) => {
				dbo.collection('spotifyTracks').findOne({ _id: track }, (err, res) => {
					if (err) console.error('There was an error when checking for duplicate playlist tracks.');

					if (res) {
						const position = object.indexOf(track);
						object.splice(position, 1);
					}
					else {
						dbo.collection('spotifyTracks').updateOne({ _id: track }, { $set: { _id: track } }, { upsert: true });
					}
					counter++;
					if (counter >= originalLength) {
						tracks.forEach((track, index, object) => {
							object[index] = `spotify:track:${track}`;
						});
						if (tracks.length === originalLength) callback(tracks, message);
						else if (tracks.length < originalLength && tracks.length > 0) callback(tracks, `${message} Some tracks will be skipped as they have already been added.`);
						else callback(null, `Album is already in the playlist. Skipping...`);
					}
				});
			});
		}
		else {
			dbo.collection('spotifyTracks').findOne({ _id: tracks }, (err, res) => {
				if (err) console.error('There was an error when checking for duplicate playlist tracks.');

				if (res) callback(null, `Song is already in playlist. Skipping...`);
				else { 
					dbo.collection('spotifyTracks').updateOne({ _id: tracks }, { $set: { _id: tracks } }, { upsert: true });
					callback([`spotify:track:${tracks}`], `Adding song to playlist.`);
				}
			});
		}
	}
};