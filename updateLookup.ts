import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@staratlas/anchor";
import { byteArrayToString, readAllFromRPC } from "@staratlas/data-source";
import { PLAYER_PROFILE_IDL, PlayerName, PlayerProfile, PlayerProfileIDLProgram } from "@staratlas/player-profile";
import { Fleet, SAGE_IDL, SageIDLProgram } from "@staratlas/sage";

const SAGE_PROGRAM_ID = new PublicKey('SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE');
const PLAYER_PROFILE_ID = new PublicKey('pprofELXjL5Kck7Jn5hCpwAL82DpTkSYBENzahVtbc9');

class FakeWallet {

    private payer: Keypair;

    constructor(payer: Keypair) {
        this.payer = payer;
    }

    signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
        throw 'not implemented - signTransaction'
    }

    signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
        throw 'not implemented - signAllTransactions'
    }

    get publicKey(): PublicKey {
        return this.payer.publicKey;
    }
}

async function fetchLookupData() {

    const rpcEndpoint: string = process.env.RPC_ENDPOINT
    const connection = new Connection(rpcEndpoint, { commitment: "confirmed" })

    const provider = new AnchorProvider(
        connection,
        new FakeWallet(Keypair.generate()),
        AnchorProvider.defaultOptions(),
    );

    const sageProgram = new Program(SAGE_IDL, SAGE_PROGRAM_ID, provider);
    const playerProfileProgram = new Program(PLAYER_PROFILE_IDL, PLAYER_PROFILE_ID, provider);

    const [playerProfiles, playerNames, fleets] = await Promise.all([
        getPlayerProfiles(connection, playerProfileProgram),
        getPlayerNames(connection, playerProfileProgram),
        getFleets(connection, sageProgram),
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

async function getFleets(connection: Connection, program: SageIDLProgram): Promise<Fleet[]> {

    return (await readAllFromRPC(
        connection,
        program,
        Fleet,
        'confirmed'))
        .filter(p => p.type === 'ok')
        .map(p => (p as any).data as Fleet);
}

async function getPlayerProfiles(connection: Connection, program: PlayerProfileIDLProgram): Promise<PlayerProfile[]> {

    return (await readAllFromRPC(
        connection,
        program,
        PlayerProfile,
        'confirmed'))
        .filter(p => p.type === 'ok')
        .map(p => (p as any).data as PlayerProfile);
}

async function getPlayerNames(connection: Connection, program: PlayerProfileIDLProgram): Promise<PlayerName[]> {

    return (await readAllFromRPC(
        connection,
        program,
        PlayerName,
        'confirmed'))
        .filter(p => p.type === 'ok')
        .map(p => (p as any).data as PlayerName);
}