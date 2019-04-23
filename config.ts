export const config = {
    uriMongo: 'mongodb://localhost:27017/tweeter',
    params: {
        q: '',
        count: 200,
        //geocode: "40.4165,-3.70256,700km",
        result_type: "recent"
        //until: "2016-01-01"
    },
    tags: ['@ahorapodemos','@psoe','@populares','@ciudadanoscs','@vox_es','@esquerra_erc','@eajpnv','#DebateRTVE',
    '#ElDebateDecisivo','#28Abril','#Podemos','#PSOE','#PartidoPopular','#PP','#Ciudadanos','#VOX']
    /* technologies: ['frontend','javascript', 'nodejs', 'python','java','php','typescript','swift',
    'Data Visualization','Logistic Regression', 'Cross-Validation','Decision Trees','Random Forests',
    'Time Series', 'Neural Networks', 'PCA', 'Dimensionality Reduction', 'kNN', 'Clustering',
    'SVM', 'Natural Language Processing', 'Naive Bayes', 'Gradient Boost', 'CNNs', 'Recommender Systems',
    'Association Rules', 'RNNs', 'Collaborative Filtering', 'Deep Learning', 'Regression'] */
}