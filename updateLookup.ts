import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@staratlas/anchor";
import { byteArrayToString, readAllFromRPC } from "@staratlas/data-source";
import { PLAYER_PROFILE_IDL, PlayerProfileIDLProgram } from "@staratlas/player-profile";
import { Fleet, SAGE_IDL, SageIDLProgram } from "@staratlas/sage";
import { Sage } from "@staratlas/sage/dist/src/idl/sage";

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

    const sage = new Program(SAGE_IDL, SAGE_PROGRAM_ID, provider);
    const playerProfile = new Program(PLAYER_PROFILE_IDL, PLAYER_PROFILE_ID, provider);


    const fleets = await getFleets(connection, sage);

    const data: Record<string, string> = fleets.reduce((acc, f) => {
        acc[f.key.toBase58()] = byteArrayToString(f.data.fleetLabel);
        return acc;
      }, {} as Record<string, string>);

      return data;

    //
    // This dummy implementation returns hardcoded lookup data:
    return {
        "DRckeF77miyiTXTJzRJxP68XqoUK9Pb3j2SWrpsHC6cC": "Alice",
        "FXtyF3qvDDGq4NrTW4AMudw7s9X3kRUxoTTYfsA5D6HB": "Bob",
        "BVUUhbHXTwKA8YbZBRixiG3jYm1QDKPZKnJGL8F5Zb1W": "Charlie",
        "7Ac12FJEM95X21QCFo3jC6wds1cYQxxwJHUvtEVJf3SX": "Dave",
        "BxYDuNR9AufjcT5DWrUFQgToF77ceESSACG8EbX8DE8r": "Eve",
        "BdNQKJw17jawL4qsKcydLHMMpUk7szcbf7oPAdF5sbFN": "Frank",
        "4vgQD1xCZ1pZ9R8U27d2kRgJZFmeV1qc8N7ehDHbKSQd": "Grace",
        "DCNuSEAgHMus5FGykLTPJuoraSvdNbTsUod5w6JAXw5U": "Heidi",
        "ARgWiVzPsdTFr5xUus8DpCkK63BsS5xAc54StfFTRvu": "Ivan",
        "FGymLRyvMYVEA1eV2FcB7v7e3rcNN1XNE34MNhrSCw61": "Judy",
        "7X2qXTB4LR7r7s9NLp2ZZFpvQNhrmFZJ7WpyaqbkRKjx": "Karl",
        "7e1gmus9ZU22k6inn8VoBKwEQpL3W6wZCtQhLhK6X6KN": "Leo",
        "7jKp5e9jgjHn6mLaoHNpzze4ZC31uixfJABsj85SjC8m": "Mia",
        "HFGnp4YDBcCUVaXQNadg42XUf4zC7vQEYoACEXnvnRmn": "Nina",
        "8GL7D7yQi6fRpMs6dugVmz9TLSrpwYoR71ewpFiekKBL": "Oscar",
        "HeoRu2gu4XhVHbg4BVdMX7S7XXhEDRaPUSSEC1coGrtg": "Pam",
        "GbYJXyruJ7CqTtXr8gwZZji3dNabCq83jLk7J7ew6n4S": "Quinn",
        "HUmgEebQnh7CDVByo4Vz85JUHXw4ashNcjGmfe3tPzmm": "Rita",
        "En5WtGVaQZ4dcLtycMVujs6L3cYmnJXVST1sAx2TvNrz": "Steve",
        "HDNahLDLjwT3V2JKEYWhAyRRwVnz2hemuucv4Vnw6DLh": "Trudy"
    };
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




async function getFleets(connection: Connection, program: Program<Sage>): Promise<Fleet[]> {

    return (await readAllFromRPC(
        connection,
        program,
        Fleet,
        'confirmed'))
        .filter(p => p.type === 'ok')
        .map(p => (p as any).data as Fleet);
}
