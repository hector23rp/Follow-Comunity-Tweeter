import * as Twitter from 'twitter';
import * as mongoose from 'mongoose';
import { Twit } from './models/twit';
import { config } from './config';
import * as Twitterstream from 'node-tweet-stream';
import { secret } from './secret';

class App {
  
  private client: Twitter;
  private uriMongo: string = config.uriMongo;
  private client_stream: Twitterstream;

  initialize() {
    // Creación de cliente de Twitter
    this.client = new Twitter(secret);

    this.client_stream = new Twitterstream(secret)

    config.tags.forEach(tag => {
      this.client_stream.track(tag);
    });
    
    // Conexión a MongoDB
    console.log('Connecting with Mongo...');
    return new Promise((resolve, rejected) => {
      mongoose.connect(this.uriMongo, (error) => {
        if (error) return rejected(error);

        return resolve(true);
      });
    });
  }

  run() {
    
    this.client_stream.on('tweet', function(tweet) {
      console.log('Tweeet received!');
      let tweetSaved = new Twit(tweet);
      tweetSaved.save();
    });
    

  }
}

const app = new App();

app.initialize().then(response => {
  console.log('Connected with MongoDB!');
  console.log('Searhcing tweets....');
  app.run();
}).catch(err => {
  console.error(err);
})

