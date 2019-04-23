import * as mongoose from 'mongoose';

const TwitSchema = new mongoose.Schema({
    text: String
}, {strict: false});

export const Twit = mongoose.model('Twit', TwitSchema);