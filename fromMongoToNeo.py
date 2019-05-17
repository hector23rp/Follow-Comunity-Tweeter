import pymongo
from neo4j import GraphDatabase, basic_auth
import os

# MongoDB connection
myclient = pymongo.MongoClient("mongodb://localhost:27017/")
mydb = myclient["tweeter"]
mycol = mydb["twits"]
twits = mycol.find()

# Neo4j connection
URI = "bolt://localhost:7687"
USER = "test"
PASS = "test"

driver = GraphDatabase.driver(URI, auth=(USER, PASS))

for tweet in twits:
    if 'retweeted_status' in tweet:
        user1 = tweet['user']
        user2 = tweet['retweeted_status']['user']
        neo4j_query = 'MERGE (source:User { id_str: ' + user1['id_str'] + '}) MERGE (target:User { id_str: ' + user2[
            'id_str'] + '}) MERGE (source)-[r:RETWEET]->(target) RETURN r'
        with driver.session() as session:
            result = session.write_transaction(lambda tx: tx.run(neo4j_query))
            print("Stats: " + str(result.consume().metadata.get("stats", {})))
