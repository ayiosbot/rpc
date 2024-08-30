/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ayios. All rights reserved.
 *  All code created by Ayios within this repository is licensed under the MIT License. Other
 *  code not created by Ayios is under their respective license, which should have an
 *  indication of whatever copyright the file is subject to.
 *--------------------------------------------------------------------------------------------*/
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

export interface RPCMessage<T = any> {
    /** The operation code sent (always a number) */
    op: number;
    /** The data passed through the message */
    d: T;
}

export class RPCListener {
    public readonly redis: Redis;
    public readonly channel: string;
    private readonly _callbacks = new Map<string, [code: number, callback: (message: RPCMessage) => void]>();
    constructor(channel: string, redis: Redis) {
        this.redis = redis;
        this.channel = channel;
        this.redis.subscribe(channel).catch(error => console.error(`RPC Error: ${error}`));
        this.redis.on('message', (rawChannel, rawContent) => {
            if (rawChannel !== channel) return;
            const content = JSON.parse(rawContent) as RPCMessage;
            this._callbacks.forEach(data => {
                if (data[0] == content.op) data[1](content.d);
            });
        });
    }
    /**
     * Bind a function to an RPC message
     * @param code The OPCode to send
     * @param callback Function to execute when a message with the provided OPCode is sent
     * @returns
     */
    onMessage<T>(code: number, callback: (message: RPCMessage<T>) => void) {
        const uuid = randomUUID();
        this._callbacks.set(uuid, [ code, callback ]);
        return uuid;
    }
    /**
     * Removes all listeners by UUID or by OPCode
     * @param target The UUID or OPCode to remove
     */
    removeListener(target: string | number) {
        if (typeof target === 'string') {
            this._callbacks.delete(target as string);
        } else if (typeof target === 'number') {
            this._callbacks.forEach((data, uuid) => {
                if (data[0] === target) this._callbacks.delete(uuid);
            });
        } else throw new Error('Attempt to remove listener by unsupported target type');
    }
}

export class RPCExecutor {
    public readonly redis: Redis;
    public readonly channel: string;
    constructor(channel: string, redis: Redis) {
        this.redis = redis;
        this.channel = channel;
    }
    /**
     * Send a message through the RPC
     * @param code Sends a message through the RPC
     * @param data The payload to send (must be able to be converted into JSON)
     * @returns Redis `publish` response
     */
    sendMessage(code: number, data: any): Promise<number> {
        return this.redis.publish(this.channel, JSON.stringify({ op: code, d: data }));
    }
}

export class RPCMulti {
    public readonly executor: RPCExecutor;
    public readonly listener: RPCListener;
    constructor(channel: string, redisExecutor: Redis, redisListener?: Redis) {
        this.executor = new RPCExecutor(channel, redisExecutor);
        this.listener = new RPCListener(channel, redisListener || redisExecutor.duplicate());
    }
    /**
     * Bind a function to an RPC message
     * @param code The OPCode to send
     * @param callback Function to execute when a message with the provided OPCode is sent
     * @returns
     */
    onMessage<T>(code: number, callback: (message: RPCMessage<T>) => void) {
        return this.listener.onMessage(code, callback);
    }
    /**
     * Removes all listeners by UUID or by OPCode
     * @param target The UUID or OPCode to remove
     */
    removeListener(target: string | number) {
        return this.listener.removeListener(target);
    }
    /**
     * Send a message through the RPC
     * @param code Sends a message through the RPC
     * @param data The payload to send (must be able to be converted into JSON)
     * @returns Redis `publish` response
     */
    sendMessage(code: number, data: any): Promise<number> {
        return this.executor.sendMessage(code, data);
    }
}