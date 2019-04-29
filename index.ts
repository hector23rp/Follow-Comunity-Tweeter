import * as Twitter from 'twitter';
import * as mongoose from 'mongoose';
import { Twit } from './models/twit';
import { config } from './config';
import * as Twitterstream from 'node-tweet-stream';
import { secret } from './secret';
import * as tunnel from 'tunnel-ssh';
import { User } from './models/user';
var neo4j = require('neo4j-driver').v1;
let fs = require('fs');

class App {
  
  public client_stream: Twitterstream;
  public mongoConnection;
  public serverTunnel;
  public neo4j_client;
  public session_neo4j;

  initialize() {
    // Creación de cliente de Twitter
    this.client_stream = new Twitterstream(secret)
    config.tags.forEach(tag => {
      this.client_stream.track(tag);
    });

    // Conexión a Neo4J
    this.neo4j_client = neo4j.driver("bolt://localhost", neo4j.auth.basic("test", "test"));
    this.session_neo4j = this.neo4j_client.session();
    
    // Conexión a MongoDB en AWS
    console.log('Connecting with Mongo...');
    return new Promise((resolve, rejected) => {
      // SSH túnel a AWS
      this.serverTunnel = tunnel({
        host: '18.233.5.144',
        username: 'ubuntu',
        privateKey: fs.readFileSync('/home/hector/Documentos/Master/DespliegueOperServicios/c09.pem'),
        port: 22,
        dstPort: 27017
      }, function(error, server) {
        console.log('Conexión SSH realizada correctamente!');
        // MongoDB
        app.mongoConnection = mongoose.connect(config.uriMongo, (error) => {
          if (error) return rejected(error);
  
          return resolve(true);
        });

      });
    });
  }

  runGetTweets() {
    console.log('Searhcing tweets....');
    this.client_stream.on('tweet', function(tweet) {
      console.log('Tweeet received!');
      let tweetSaved = new Twit(tweet);
      tweetSaved.save();
    });
  }

  runSaveTweetsMentionsInNeo4j() {
    
    console.log('Saving tweets from AWS MongoDB to Neo4J local...');
    var cursor = Twit.find({"entities.user_mentions.1": { $exists:  true } } ).cursor();
    let numMentions = 0;
    cursor.on('data', function(doc) {
      numMentions++;
      if((numMentions % 10000) == 0) {
        console.log(`Cogidas ${numMentions} menciones`);
      }
      const user1 = doc['_doc']['user'];
      for(let index in doc['_doc']['entities']['user_mentions']) {
        let user2 = doc['_doc']['entities']['user_mentions'][index];
        
        let result = app.saveInNeo4j(user1, user2, 'MENTION');
      }
    });

    cursor.once('end', function() {
      console.log('Número de tweets con menciones: ',numMentions);
      app.stop();
    });
  }

  saveInNeo4j(user1: User, user2: User, realtionship: string) {
    user1.name = app.removeQuotes(user1.name);
    user2.name = app.removeQuotes(user2.name);
    user1.name = app.removeEmojis(user1.name);
    user2.name = app.removeEmojis(user2.name);
    const session = this.session_neo4j;

    return new Promise((resolve, rejected) => {
      session.run(`MERGE (source:User { name: "${user1.name}", id: "${user1.id}" }) MERGE (target:User { name: "${user2.name}", id: "${user2.id}" }) MERGE (source)-[r:${realtionship}]->(target) RETURN r`)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        rejected(error);
      });
    });
  }

  removeQuotes(text) {
    if (text.indexOf('"') >= 0) {
      text = text.replace(/["']/g, "");
    }
    return text;
  }

  removeEmojis(text) {
    var regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
    return text.replace(regex, '');
  }

  stop() {
    console.log('Closing SSH connection...');
    this.serverTunnel.close();
    console.log('Closing MongoDB connection...');
    mongoose.connection.close()
    console.log('Closing Neo4J connection...');
    this.session_neo4j.close();
    /* console.log('Closing Twitter connection...');
    this.client_stream.close(); */
  }

}

const app = new App();

app.initialize().then(response => {
  console.log('Connected with MongoDB!');
  app.runSaveTweetsMentionsInNeo4j();
}).catch(err => {
  console.error(err);
})

