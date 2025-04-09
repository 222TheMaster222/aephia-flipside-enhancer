import dotenv from 'dotenv';
import fs from 'fs';
import { byteArrayToString } from "@staratlas/data-source";
import { createRpcContext, getFleets, getPlayerNames, getPlayerProfiles } from 'rpc';

const LOOKUP_FILE = 'lookup.json'

dotenv.config();

type LookupData = Record<string, string>

async function updateLookupFile() {
    try {

        const existingData = getLookupDataFromFile();
        const newData = await getLookupDataFromRpc();

        // Merge using the spread operator; values in newData will override those in existingData.
        const mergedData = { ...existingData, ...newData };

        // Sort the keys of the data object and rebuild the object.
        const sortedData = Object.keys(mergedData)
            .sort()
            .reduce((acc, key) => {
                acc[key] = mergedData[key];
                return acc;
            }, {} as LookupData);

        fs.writeFileSync(LOOKUP_FILE, JSON.stringify(sortedData, null, 2));
        console.log('Lookup file updated successfully.', LOOKUP_FILE);
    } catch (err) {
        console.error('Error updating lookup file:', err);
        process.exit(1);
    }
}

function getLookupDataFromFile(): LookupData {

    if (fs.existsSync(LOOKUP_FILE)) {
        console.log('reading existing lookup data from disk', LOOKUP_FILE)
        const json = fs.readFileSync(LOOKUP_FILE, 'utf8')
        return JSON.parse(json) as LookupData
    }

    console.log('lookup data not found on disk')

    return {};
}

async function getLookupDataFromRpc() {
    console.log('fetching lookup data from rpc')

    const rpcEndpoint: string = process.env.RPC_ENDPOINT

    const context = createRpcContext(rpcEndpoint);

    const [playerProfiles, playerNames, fleets] = await Promise.all([
        getPlayerProfiles(context),
        getPlayerNames(context),
        getFleets(context),
    ])

    // Build mapping for player names based on playerNames array.
    const playerNameMapObject = playerNames.reduce((acc, x) => {
        acc[x.data.profile.toBase58()] = x.name;
        return acc;
    }, {});

    // Start with player profiles mapping.
    let data = playerProfiles.reduce((acc, x) => {
        acc[x.key.toBase58()] = playerNameMapObject[x.key.toBase58()];
        return acc;
    }, {} as LookupData)

    // Merge fleets mapping into data.
    data = fleets.reduce((acc, f) => {
        acc[f.key.toBase58()] = byteArrayToString(f.data.fleetLabel);
        return acc;
    }, data);

    // Sort the keys of the data object and rebuild the object.
    const sortedData = Object.keys(data)
        .sort()
        .reduce((acc, key) => {
            acc[key] = data[key];
            return acc;
        }, {} as LookupData);

    return sortedData;
}

console.log('start script')
updateLookupFile().finally(() => {
    console.log('end script')
});
