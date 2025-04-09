import dotenv from 'dotenv';
import fs from 'fs';
import { byteArrayToString } from "@staratlas/data-source";
import { createRpcContext, getFleets, getPlayerNames, getPlayerProfiles } from 'rpc';

dotenv.config();

async function fetchLookupData() {

    const rpcEndpoint: string = process.env.RPC_ENDPOINT

    const context = createRpcContext(rpcEndpoint);

    const [playerProfiles, playerNames, fleets] = await Promise.all([
        getPlayerProfiles(context),
        getPlayerNames(context),
        getFleets(context),
    ])

    const playerNameMapObject = playerNames.reduce((acc, x) => {
        acc[x.data.profile.toBase58()] = x.name;
        return acc;
    }, {});

    let data = playerProfiles.reduce((acc, x) => {
        acc[x.key.toBase58()] = playerNameMapObject[x.key.toBase58()];
        return acc;
    }, {} as Record<string, string>)

    data = fleets.reduce((acc, f) => {
        acc[f.key.toBase58()] = byteArrayToString(f.data.fleetLabel);
        return acc;
    }, data);

    return data;
}

async function updateLookupFile() {
    try {
        const lookupData = await fetchLookupData();
        const filePath = 'lookup.json';
        fs.writeFileSync(filePath, JSON.stringify(lookupData, null, 2));
        console.log('Lookup file updated successfully.', filePath);
    } catch (err) {
        console.error('Error updating lookup file:', err);
        process.exit(1);
    }
}

console.log('start script')
updateLookupFile().finally(() => {
    console.log('end script')
});
