from sshtunnel import SSHTunnelForwarder
import pymongo
import pprint

MONGO_HOST = '18.233.5.144'
MONGO_DB = "aws-mongodb"
MONGO_USER = "ubuntu"

server = SSHTunnelForwarder(
    (MONGO_HOST),
    ssh_username=MONGO_USER,
    ssh_private_key='/home/hector/.ssh/c09.pem',
    remote_bind_address=('127.0.0.1', 27017),
    local_bind_address=('127.0.0.1', 27017)
)

server.start()

client = pymongo.MongoClient('127.0.0.1', 27017)
db = client['tweeter']
pprint.pprint(db.collection_names())

server.stop()