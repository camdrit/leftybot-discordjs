const { spotifyConfig } = require('../config.json');

module.exports = {
    name: 'spotify',
    description: 'posts a link to the server spotify playlist',
    execute(message) {
        return message.channel.send(`This is the official server Spotify playlist! :musical_note: \nhttps://open.spotify.com/user/${spotifyConfig.targetPlaylistOwner}/playlist/${spotifyConfig.targetPlaylist}\nAny new songs you post will be automatically added to this playlist by me. It even works with albums!`);
    }
}