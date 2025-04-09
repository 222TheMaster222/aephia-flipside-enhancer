import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider, Program } from "@staratlas/anchor";
import { readAllFromRPC } from "@staratlas/data-source";
import { PLAYER_PROFILE_IDL, PlayerName, PlayerProfile, PlayerProfileIDLProgram } from "@staratlas/player-profile";
import { Fleet, SAGE_IDL, SageIDLProgram } from "@staratlas/sage";
import { bs58 } from "@staratlas/anchor/dist/cjs/utils/bytes";

const SAGE_PROGRAM_ID = new PublicKey('SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE');
const PLAYER_PROFILE_ID = new PublicKey('pprofELXjL5Kck7Jn5hCpwAL82DpTkSYBENzahVtbc9');
const GAME_ID = new PublicKey('GAMEzqJehF8yAnKiTARUuhZMvLvkZVAsCVri5vSfemLr');

export type RpcContext = {
    connection: Connection;
    sage: SageIDLProgram;
    playerProfile: PlayerProfileIDLProgram;
}

export function createRpcContext(endpoint: string): RpcContext {

    const connection = new Connection(endpoint, { commitment: "confirmed" })

    const provider = new AnchorProvider(
        connection,
        new FakeWallet(Keypair.generate()),
        AnchorProvider.defaultOptions(),
    );

    const sage = new Program(SAGE_IDL, SAGE_PROGRAM_ID, provider);
    const playerProfile = new Program(PLAYER_PROFILE_IDL, PLAYER_PROFILE_ID, provider);

    return {
        connection,
        sage,
        playerProfile,
    }
}

export async function getFleets(context: RpcContext): Promise<Fleet[]> {
    const gameId58 = bs58.encode(GAME_ID.toBuffer())

    return (await readAllFromRPC(
        context.connection,
        context.sage,
        Fleet,
        'confirmed',
        [{
            memcmp: {
                offset: 8 + 1,
                bytes: gameId58,
            }
        }]))
        .filter(p => p.type === 'ok')
        .map(p => (p as any).data as Fleet);
}

export async function getPlayerProfiles(context: RpcContext): Promise<PlayerProfile[]> {

    return (await readAllFromRPC(
        context.connection,
        context.playerProfile,
        PlayerProfile,
        'confirmed'))
        .filter(p => p.type === 'ok')
        .map(p => (p as any).data as PlayerProfile);
}

export async function getPlayerNames(context: RpcContext): Promise<PlayerName[]> {

    return (await readAllFromRPC(
        context.connection,
        context.playerProfile,
        PlayerName,
        'confirmed'))
        .filter(p => p.type === 'ok')
        .map(p => (p as any).data as PlayerName);
}

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