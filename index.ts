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
      /* this.serverTunnel = tunnel({
        host: '18.233.5.144',
        username: 'ubuntu',
        privateKey: fs.readFileSync('/home/hector/Documentos/Master/DespliegueOperServicios/c09.pem'),
        port: 22,
        dstPort: 27017
      }, function(error, server) { */
        console.log('Conexión SSH realizada correctamente!');
        // MongoDB
        app.mongoConnection = mongoose.connect(config.uriMongo, (error) => {
          if (error) return rejected(error);
  
          return resolve(true);
        });

      //});
    });
  }

  runGetTweets() {
    this.client_stream.on('tweet', function(tweet) {
      console.log('Tweeet received!');
      let tweetSaved = new Twit(tweet);
      tweetSaved.save();
    });
  }

  runSaveTweetsMentionsInNeo4j() {
    
    var cursor = Twit.find({"entities.user_mentions.1": { $exists:  true } } ).cursor();
    cursor.on('data', function(doc) {
      const user1 = doc['_doc']['user'];
      doc['_doc']['entities']['user_mentions'].forEach(user2 => {
        app.saveInNeo4j(user1, user2, 'MENTION')
        .then(res => console.log('Guardad menciones de ', user1.name))
        .catch(error => console.log(error));
      })
    });

    cursor.once('end', function() {
      
    });

    /* this.saveInNeo4j({name: 'pepe', id: '12', lang: 'es'}, {name: 'pepa', id: '14', lang: 'es'}, 'MENTION')
        .then(res => this.stop())
        .catch(error => console.log(error)); */
  }

  saveInNeo4j(user1: User, user2: User, realtionship: string) {
    const session = this.session_neo4j;
    return new Promise((resolve, rejected) => {
      session.run("MERGE (u:User { name: {name}, id: {id} });", { name: user1.name, id: user1.id })
      .subscribe({
        onNext: (record) => {},
        onCompleted: () => {
          console.log(`${user1.name} guardado!`);
          session.run("MERGE (u:User { name: {name}, id: {id} });", { name: user2.name, id: user2.id })
          .subscribe({
            onNext: (record) => {},
            onCompleted: () => {
              console.log(`${user2.name} guardado!`);
              session.run(`MATCH (a:User {id: '${user1.id}'}),(b:User {id: '${user2.id}'})
                          MERGE (a)-[r:${realtionship}]->(b)
                          RETURN r`)
                      .subscribe({
                        onNext: (record) => {},
                        onCompleted: () => {
                          console.log(`Arist (${user1.name}) -> ${realtionship} -> (${user2.name}) created!`);
                          resolve(true);
                        },
                        onError: (error) => {rejected(error)} 
                      })

            },
            onError: (error) => { rejected(error) }
          });
        },
        onError: (error) => { rejected(error) }
      });
    });
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
  console.log('Searhcing tweets....');
  /* Twit.countDocuments({}, function(err, count) {
    console.log('Number of tweets: ',count);

  }); */
  app.runSaveTweetsMentionsInNeo4j();
}).catch(err => {
  console.error(err);
})

