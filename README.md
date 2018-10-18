# leftybot-discordjs
A reimagining of my Discord.NET bot for Discord.js

# example config.json

Place this in the root directory of the bot.

```json
{
    "prefix" : "~",
    "token" : "bot_token_here",
    "defaultCooldown" : 3,
    "mongoDB" : {
      "host" : "localhost",
      "port" : 27017,
      "db" : "leftybot"
    },
    "stringResources" : {
      "errors": {
        "GenericExceptionError" : "There was a problem during the execution of the requested command!",
        "NoArgumentsFoundError" : "There weren't any arguments supplied!"
      }
    },
    "channels" : {
      "birthdayAnnouncements" : "channel_name_here",
      "spotifyWatch" : "channel_name_here"
    },
    "spotifyConfig" : {
      "spotifyEnabled" : true,
      "clientID" : "spotify_api_client_id",
      "clientSecret" : "spotify_api_client_secret",
      "redirectUri" : "http://localhost:8000/",
      "targetPlaylist" : "target_playlist_id",
      "targetPlaylistOwner" : "target_playlist_owner"
    }
  }
  ```
