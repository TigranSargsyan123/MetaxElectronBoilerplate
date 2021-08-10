
/*
vim: tabstop=8:shiftwidth=8:expandtab:fo=croq:syntax=javascript:smartindent

revision: {

        name: metax.mjs

        repo path: https://yerevan.leviathan.am:7071

        version: ca784ae0-0ed8-44bd-9148-622ceec623f2

        previous_version: 1e291f24-5ece-4d01-9807-cbb5e3872f7e

        metax.min.mjs: 059e4122-24a3-45a2-8953-7c650f675607

        authors: tatevik_d, hayk_b, tatevik_d, anna_a, anna_a,
                tatevik_d

        date: Չրք Փտր 12 10:21:04 +04 2020


        comment: 1. Added new APIs get_metax_info, set_metax_info
                 2. Added register and unregister listener on metax sync finish
                 3. Implemented get user keys api
                 4. Added handling of the generic reciver of sendto metax web api
                 5. Added implementation of the sendto_by_key
                 6. Added implementation of the get_online_peers functionality
                 7. Added implementation of the keys transfer
                 8. Added implementation of the regenerate_user_keys functionality
                 9. Added flag for not sending my device registered notifications
                 10. Done fix connected with metax sync message structrue changes
                 11. Added registerMetaxEvents listeners for registering callback
                           when metax event is received to websocket. No tests added
                                (Tests were written for unit metax.To test this,
                                        need to run at least one peer of metax)
                12. Added integration of the metax_web_api metax access token
}

*/

/** 
 * @file metax.mjs 
 * @author e-Hayq cjsc, Yerevan, Armenia
 * @copyright e-Hayq cjsc, Yerevan, Armenia
 * @license MIT opensource license
 */

/** @private */
const notDefinedYet = 0;

/** The Metax singleton object */
let metax = notDefinedYet;

/** 
 * @summary The Metax singleton class: wrapper over metax_web_api REST API 
 *
 * @todo Add methods to manage metax_web_api process: start/restart/stop
 *
 * @todo Add methods to modify config-file of the metax_web_api (e.g. change
 *       port, connect to peer, manage storage, etc)
 *
 */
class Metax {
        /**
         *  @summary Creates/initializes the singleton instance.
         *
         *  @description Note that the API is not connected. To fully
         *      initialize still need to call {@link connect}.
         *  
         *  @todo: derive this from Singleton class to avoid 
         *         messy code everywhere
         */
        constructor() { 
                console.assert( metax === notDefinedYet,
                        'Trying to create second instance of class Metax');
                this.mHost = notDefinedYet;
                this.mPort = notDefinedYet;
                this.mAccessToken = notDefinedYet;
                this.mListeners = {};
                this.mEvents = [];
                this.mGenericProtocolListeners = [];
                this.mProtocol = notDefinedYet;
                this.mGetRequest = notDefinedYet;
                this.mCopyRequest = notDefinedYet;
                this.mRegisterListenerRequest = notDefinedYet;
                this.mSavePathRequest = notDefinedYet;
                this.mDeleteRequest = notDefinedYet;
                this.mSaveRequest = notDefinedYet;
                this.mShareRequest = notDefinedYet;
                this.mSendToRequest = notDefinedYet;
                this.mGetOnlinePeersRequest = notDefinedYet;
                this.mSendEmailRequest = notDefinedYet;
                this.mServicePath = notDefinedYet;
                this.mUnregisterListenerRequest = notDefinedYet;
                this.mGetMetaxInfoRequest = notDefinedYet;
                this.mSetMetaxInfoRequest = notDefinedYet;
                this.mWebsocket = notDefinedYet;
                this.mWebsocketPath = notDefinedYet;
                this.mWebsocketProtocol = notDefinedYet;
                this.mGetUserKeysRequest = notDefinedYet;
                this.mStartPairing = notDefinedYet;
                this.mCancelPairing = notDefinedYet;
                this.mGetPairingPeers = notDefinedYet;
                this.mRequestKeysRequest = notDefinedYet;
                this.mRegenerateUserKeysRequest = notDefinedYet;
                this.mRequestKeysRequestSecondParameter = notDefinedYet;
        }

        /**
         *  @summary Connects with metax server
         *  @param {String} h is the DNS or IP of host running metax_web_api
         *  @param {Number} p is the metax_web_api server port name on host
         *  @param {Boolean} e if true then will use GPG/AES encryption,
         *                   otherwise will store data in Metax unencrypted
         *  @param {Boolean} s if true, then will use https, otherwise
         *                   will use http to connect with metax_web_api
         *  @todo Add public/private key management & user-info management.
         *  @todo Decide on using http vs https (e.g. check if local fails
         *        with http because of lack of certificate...)
         *
         *  Implementation Note: Have to pass on methods bound with this,
         *  because inside the handlers it's lost, e.g. inside
         *  websocket.onmessage the variable 'this' is set to websocket.
         */
        async connect(h='localhost',p=8001,e=true,t="",s=false) {
                console.assert(metax === this, 'metax must be a singleton');
                this.setupConnectionParameters(h,p,e,t,s);
                return this.createWebsocket();
        }

        /**
         *  @summary Disonnects from metax server
         */
        async disconnect() {
                this.mWebsocket.onclose = () => {};
                await this.mWebsocket.close();
                return 'success';
        }

        /** 
         * @summary Check if the given string is a valid UUID-4 format.
         * @param uuid - input string to check
         * @todo find out if we should support UUID-5 or stick with 4
         * @todo: derive this from UUID class, 
         *         where other functions should be put
         */
        isValidUUID(uuid) {
                return /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(uuid);
        }

        /**
         * @summary Save given data with given mime-type and return uuid
         * @param data - any data (blob/json/etc) to be sent to Metax
         * @param mime - MIME type of the object to be served back in get()
         */
        async save(data, mime='application/javascript') {
                const r = await this.HTTPPost(this.mSaveRequest, data, mime,
                                this.mAccessToken);
                console.assert(
                        this.isValidUUID(r.uuid), 
                        `response to metax.save(${data},${mime}) ` + 
                        `returned an invalid uuid=${r.uuid}`
                );
                return r.uuid;
        }

        /**
         * @summary Ask local metax to take data from the given file
         * @param data - any data (blob/json/etc) to be sent to Metax
         * @param mime - MIME type of the object to be served back in get()
         */
        async takeFile(path, mime) {
                const r = await this.HTTPPost(this.mSavePathRequest,path,mime,
                                this.mAccessToken);
                console.assert(
                        this.isValidUUID(r.uuid), 
                        `response to metax.takeFile(${path},${mime}) ` + 
                        `returned an invalid uuid=${r.uuid}`
                );
                return r.uuid;
        }

        /**
         * @summary Function save data instead of node option
         * TODO: this is draft version of this function, we need to add generic
         * implementation
         * TODO: need to make test for this function
         */
        async takeFileFromUrl(e, s, enc = 0) {
                const p = `${this.mProtocol}://${this.mHost}:${this.mPort}`;
                const r = `${p}/db/save/data?enc=${enc}`;
                return fetch(r, {
                                 method: 'post',
                                 headers: { 'Metax-Content-Type': s },
                                 body: e
                                 })
                .catch( e => {
                        throw Error(`fetch(${url}) resulted in error:\n ${e}`);
                });
        }

        /**
         * @summary Update data at given uuid and mime-type.
         * @param uuid - must be a valid uuid of existing object in Metax
         * @param data - is the new value to be saved for the object
         * @param mime - must be the same as when used to create the object.
         * @todo Metax - must be modified to not require MIME upon update.
         */
        async update(uuid,data,mime='application/json') {
                console.assert(
                        this.isValidUUID(uuid), 
                        `metax.update() is passed an invalid uuid=${uuid}`
                );
                const r = await this.HTTPPost(
                        this.mSaveRequest + `&id=${uuid}`,
                        data, mime, this.mAccessToken
                );
                console.assert(
                        r.uuid === uuid, 
                        `metax.update(${uuid}...) returned a `+
                        `different uuid=${uuid}`
                );
                return 'success';
        }

        /**
         * @summary Copy data at given uuid
         * @param uuid - must be a valid uuid of existing object in Metax
         */
        async copy(uuid) {
                console.assert(
                        this.isValidUUID(uuid), 
                        'metax.copy() is passed an invalid uuid =',
                        uuid
                );
                const r = await this.HTTPGet(this.mCopyRequest + uuid,
                                this.mAccessToken);
                console.assert(r, 'response to metax.copy() is not ok');
                return r;
        }

        /**
         * @summary Share specified data for the given url
         * @param uuid - must be a valid uuid of existing object in Metax
         * @param public_key - user public key
         * todo: need to add test
         * todo: need to add accept share
         */
        async share(uuid, public_key, mime) {
                console.assert(
                        this.isValidUUID(uuid),
                        `metax.share() is passed an invalid uuid=${uuid}`
                );
                const r = await this.HTTPPost(
                        this.mShareRequest + `&id=${uuid}key=${public_key}`,
                        `key=${public_key}`, mime, this.mAccessToken)
                .catch( e => {
                        throw Error(`share(${uuid}) resulted` +
                               `in error:\n ${e}`);
                });
                console.assert(
                                r.share_uuid === uuid,
                                `metax.share(${uuid}...) returned a `+
                                `different uuid=${uuid}`
                              );
                return r;
        }

        /**
         * @summary Accept share for specified uuid
         * @param uuid - must be a valid uuid of existing object in Metax
         * @param public_key - encripted key
         * @param iv - initialization vector
         */
        async accept_share(uuid, public_key, iv,  mime) {
                console.assert( this.isValidUUID(uuid), `metax.accept_share() +
                                is passed an invalid uuid=${uuid}`);
                const p = `key=${public_key}&iv=${iv}`
                const r = await this.HTTPPost(
                        this.mAcceptShareRequest + `&id=${uuid}`, p, mime,
                        this.mAccessToken)
                .catch( e => {
                        throw Error(`accept_share(${uuid}) resulted` +
                                `in error:\n ${e}`);
                });
                console.assert(
                                r.share === "accepted",
                                `metax.accept_share is not accepted`
                              );
                return 'success';
        }

        /**
         * @summary Send email
         * @param to - must be a valid email address of the recipent
         * @param cc - valid email address for cc
         * @param bcc - valid email address for bcc
         * @param from - valid address of sender, or name(adn/or lastname)
         * followed by email address in <> parenthesis
         * @param subject - subject of the email
         * @param message - content of the email
         * @param mime - mime type for sending request
	 * @param server - server of sending email
	 * @param port - port of sending email
         */
        async send_email(to, cc, bcc, from, subject, message, mime, server, port = 587, password = '') {
                const password_url = password == '' ?
                        '' : `&password=${password}`;
                const p = `to=${to}&cc=${cc}&bcc=${bcc}&from=${from}\
                          &subject=${subject}&message=${message}\
                          &server=${server}&port=${port}${password_url}`;
                console.log(p)
                const r = await this.HTTPPost(
                                this.mSendEmailRequest + p, p, mime,
                                this.mAccessToken)
                .catch( e => {
                        throw Error(`send_email(${to}) resulted in` +
                                `error:\n ${e}`);
                });
                console.assert(
                                r.success === 1,
                                `metax.send_email function isfailed`
                              );
                return 'success';
        }

        /**
         * @summary Sendto request by key
         * @param data - any data which need to be send to peer
         * @param public_key - receiver's pulic key
         */
        async sendto_by_key(public_key, data, mime='application/json') {
                const k = encodeURIComponent(public_key);
                const d = encodeURIComponent(data);
                const r = await this.HTTPPost(this.mSendToRequest,
                    `key=${k}&data=${d}`, mime, this.mAccessToken)
                .catch( e => {
                        throw Error(`sendto_by_key(${data}) resulted in` +
                                `error:\n ${e}`);
                });
                return r;
        }

        /**
         * @brief Get Metax online peer list: address, device_id,
         *      user_public_key
         * @throws Error if the request to Metax server failed.
         */
        async get_online_peers() {
                const r = await this.HTTPGet(this.mGetOnlinePeersRequest,
                                this.mAccessToken)
                .catch( e => {
                        throw Error(`metax.HTTPGet(${this.mGetOnlinePeersRequest})`+
                                ` resulted in error:\n ${e}`);
                });
                const l = await r.json();
                return l;
        }

        /**
         * @summary Delete data at given uuid 
         * @param uui - must be a valid uuid of the existing object in Metax
         */
        async delete_from_db(uuid) {
                console.assert(
                        this.isValidUUID(uuid), 
                        `metax.delete_from_db() is passed an invalid +
                        uuid=${uuid}`);
                await this.HTTPGet( this.mDeleteRequest + `id=${uuid}`,
                                this.mAccessToken)
                .then( async r => {
                                const q = await r.json();
                                console.assert( q.deleted === uuid, 
                                        `metax.delete_from_db(${uuid}...)` +
                                        `returned a `+ `different uuid=${uuid}`
                                );
                })
                .catch( e => {
                        throw Error(`delete_from_db(${uuid}) resulted in` +
                                `error:\n ${e}`);
                });
                return 'success';
        }

        /**
         *  @sumary Fetches and returns data at given uuid
         *  @param uuid must e a valid UUID of existing data in Metax
         *  @throws Error if network error occured or if UUID is not found.
         *  @todo Throw different errors for each case: NetworkError and 
         *        UUIDIsNotFound error, and UUIDAccessDenied error, etc.
         *  @todo Maybe we don't want to differentiate between Not-Found
         *        and permisison-denied for security reasons. 
         */
        async get(uuid) {
                console.assert(
                        this.isValidUUID(uuid), 
                        'metax.get() is passed an invalid uuid =',
                        uuid
                );
                const r = await this.HTTPGet(this.mGetRequest + uuid,
                                this.mAccessToken);
                console.assert(r && r.ok, 'response to metax.get() is not ok');
                return r;
        }

        /**
         * @sumary Register generic protocol function callback
         * @param {MetaxListenerCallback} cb is the callback to be
         */
        async registerGenericProtocol(cb) {
                try {
                        this.mGenericProtocolListeners.push(cb);
                } catch (e) {
                        console.error(`Unable to add Callback: ${e}`);
                }
        }

        /**
         * @sumary Unregister generic protocol
         * @param {MetaxListenerCallback} cb is the callback to be
         */
        async unregisterGenericProtocol(cb) {
                console.assert(this.mGenericProtocolListeners);
                const i = this.GenericProtocolCallBack.indexOf(cb);
                if (-1 != i) {
                        this.GenericProtocolCallBack.splice(i, 1);
                }
        }
        
        /**
         * @sumary Register callback to metax events
         * @param {MetaxEventsCallback} cb is the callback to be
         */
        async registerMetaxEvents(cb) {
                try {
                         console.assert(this.mEvents);
                         this.mEvents.push(cb);
                } catch (e) {
                        console.error(`Unable to add Callback: ${e}`);
                }
        }
        
        /**
         * @sumary Unregister callback to metax events
         * @param {MetaxEventsCallback} cb is the callback to be
         */
        async unregisterMetaxEvents(cb) {
                console.assert(this.mEvents);
                const i = this.mEvents.indexOf(cb);
                if (-1 != i) {
                        this.mEvents.splice(i, 1);
                }
        }

        /**
         * @callback MetaxListenerCallback 
         * @brief Callbacs listening to changes in Metax
         * @see {@link registerListener} and {@link unregisterListener} 
         *      which use this callback
         */

        /**
         * @brief Register callback as listener to changes to data at uuid
         * @param {UUID} uuid is the data-id being monitored
         * @param {MetaxListenerCallback} cb is the callback to be 
         * @throws Error if the request to Metax server failed.
         * @todo Differentiate errors (e.g. no-permission, uuid not found,
         *      network-error, etc).
         */
        async registerListener(uuid, cb, b) { 
                console.assert(this.mListeners);
                let callbacks = this.mListeners[uuid];
                if (! callbacks) {
                        const url = this.mRegisterListenerRequest + uuid;
                        await this.HTTPGet(url, this.mAccessToken)
                        .catch(e => { 
                                throw Error(`metax.HTTPGet(${url}) `+
                                        `resulted in error:\n ${e}`); 
                        });
                        callbacks = this.mListeners[uuid] = [];
                }
                console.assert(callbacks.indexOf(cb) === -1, 
                        `the uuid ${uuid} already has ` +
                        `a registered callback ${cb}`);
                callbacks.push({"call" : cb, "not_send_me" : b});
        }

        /**
         *  @todo break into unregisterTheLastListener and 
         *        removeListenerFromArray or something like that
         *
         *  Note: we want to delete the last callback (listener) only if the 
         *        unregisterListener callback has succeded. If it fails - the 
         *        anomaly should not be hidden by just unregistering the CB.
         */
        async unregisterListener(uuid,cb) {
                console.assert(this.isValidUUID(uuid), 'unregisterListener ' +
                        `is called with an invalid uuid=${uuid}`);
                const callbacks = this.mListeners[uuid];
                console.assert(callbacks, 
                        'there is no listener registered ' + `for ${uuid}`);
                console.assert(callbacks.length > 0
                        , `listeners list for ${uuid} found but is empty`);
                if (callbacks.length === 1) { 
                        console.assert(cb === callbacks[0], 
                                `the only registered callback for ${uuid}`+
                                ` is not ${cb}`);
                        const url = this.mUnregisterListenerRequest+ uuid;
                        await this.HTTPGet(url, this.mAccessToken) 
                        .catch( e => { 
                                throw Error(`metax.HTTPGet(${url})`+
                                            ` resulted in error:\n ${e}`); 
                        });
                        delete this.mListeners[uuid]; 
                } else {
                        let p = false;
                        for(let j in callbacks) {
                                if(cb == callbacks[j].call) {
                                        callbacks.splice(j,1);
                                        p = true;
                                        break;
                                }
                        }
                        console.assert(p !== 0, `the listeners for ${uuid} ` +
                                `do not contain the callback ${cb}`);
                }
        }

        /**
         * @brief Get info about Metax: user public key, device public key,
         *        user info uuid, device info uuid
         * @throws Error if the request to Metax server failed.
         */
        async getMetaxInfo() {
                const r = await this.HTTPGet(this.mGetMetaxInfoRequest,
                                this.mAccessToken)
                .catch( e => {
                        throw Error(`metax.HTTPGet(${this.mGetMetaxInfoRequest})`+
                                ` resulted in error:\n ${e}`);
                });
                const i = await r.json();
                console.assert(
                        "user_public_key" in i &&
                        "user_info_uuid" in i &&
                        "device_public_key" in i &&
                        "device_info_uuid" in i,
                        `error in getting metax info`
                      );
                return i;
        }

        /**
         * @brief Set info about Metax, which then can be retreived with
         * getMetaxInfo request.
         * @param {UUID} uuid of metax user info
         * @throws Error if the request to Metax server failed.
         * Note: only setting user info uuid is supported
         * TODO: add setting of device ino uuid after Metax supports it
         */
        async setMetaxInfo(uuid) {
                const url = this.mSetMetaxInfoRequest + uuid;
                await this.HTTPGet(url, this.mAccessToken)
                        .catch(e => {
                                throw Error(`metax.HTTPGet(${url}) `+
                                        `resulted in error:\n ${e}`);
                });
        }

        /**
         * @private
         * setup member-variables for connection paramters and paths
         */
        setupConnectionParameters(h,p,e,t,s) {
                console.assert(metax === this, 'metax must be a singleton');
                metax.mAccessToken = t;
                metax.mHost = h;
                metax.mPort = p;
                metax.mEncryption = e ? 1 : 0;
                metax.mProtocol = s ? 'https' : 'http';
                metax.mWebsocketProtocol = s ? 'wss' : 'ws';
                metax.mWebsocketPath = 
                        `${metax.mWebsocketProtocol}://${h}:${p}`;
                metax.mServicePath = `${metax.mProtocol}://${h}:${p}/`;
                metax.mSaveRequest = 
                        metax.mServicePath + 
                        `db/save/node?enc=${metax.mEncryption}`;
                metax.mShareRequest = 
                        metax.mServicePath + `db/share?`;
                metax.mSendToRequest = 
                        metax.mServicePath + `db/sendto`;
                metax.mGetOnlinePeersRequest =
                        metax.mServicePath + `config/get_online_peers`;
                metax.mSendEmailRequest = 
                        metax.mServicePath + `sendemail?`;
                metax.mAcceptShareRequest =
                        metax.mServicePath + `db/accept_share?`;
                metax.mSavePathRequest = 
                        metax.mServicePath + 
                        `db/save/path?enc=${metax.mEncryption}`;
                metax.mGetUserKeysRequest =
                        metax.mServicePath + `config/get_user_keys`;
                metax.mDeleteRequest = 
                        metax.mServicePath + `db/delete?`;
                metax.mSaveDataRequest = 
                        metax.mServicePath + `db/save/data?`;
                metax.mRegisterListenerRequest =
                        metax.mServicePath + `db/register_listener?id=`;
                metax.mUnregisterListenerRequest =
                        metax.mServicePath + `db/unregister_listener?id=`;
                metax.mGetRequest = metax.mServicePath + `db/get?id=`;
                metax.mCopyRequest = metax.mServicePath + `db/copy?id=`;
                metax.mGetMetaxInfoRequest =
                        metax.mServicePath + `config/get_metax_info`;
                metax.mSetMetaxInfoRequest =
                        metax.mServicePath +
                        `config/set_metax_info?metax_user_uuid=`;
                metax.mListeners = {};
                metax.mStartPairing =
                        metax.mServicePath + `config/start_pairing?timeout=`;
                metax.mCancelPairing =
                        metax.mServicePath + `config/cancel_pairing`;
                metax.mGetPairingPeers =
                        metax.mServicePath + `config/get_pairing_peers`;
                metax.mRequestKeysRequest =
                        metax.mServicePath + `config/request_keys?ip=`;
                metax.mRegenerateUserKeysRequest =
                        metax.mServicePath + `config/regenerate_user_keys`;
                metax.mRequestKeysRequestSecondParameter = `&code=`;
        }

        /**
         * @private
         *
         */
        async createWebsocket() {
                return new Promise((resolve,reject)  => {
                        metax.mWebsocket = new WebSocket(metax.mWebsocketPath +
                                "?token=" + this.mAccessToken);
                        metax.mWebsocket.onerror = e => reject(e);
                        metax.mWebsocket.onclose = e => reject(e);
                        metax.mWebsocket.onopen = e => { 
                                metax.mWebsocket.onmessage = 
                                        e => metax.dispatchWebSocketMessage(e);
                                metax.mWebsocket.onerror = 
                                        e => metax.handleWebSocketError(e);
                                metax.mWebsocket.onclose = 
                                        e => metax.handleWebSocketClose(e);  
                                resolve('websocket connected'); 
                        };
                });
        }

        /** 
         * @private 
         * parse web-socket event data
         */
        parseWebSocketEvent(e) {
                try {
                        return JSON.parse(e.data);
                } catch (e) {
                        console.assert(false,
                                `failed to parse data field of the ` + 
                                `Metax on-update event: ${JSON.stringify(e)}`);
                        throw e;
                }
        }

        /**@private */
        handleMetaxEvents(e, msg) {
                const ev = msg['event'];
                const callbacks = this.mEvents;
                for ( let cb in callbacks ) {
                        try {
                                if(! callbacks[cb].not_send_me) {
                                        callbacks[cb](ev);
                                }
                        } catch (e) {
                                console.error(`Metax events ` +
                                                `threw ` +
                                                `an assertion: ` +
                                                `${JSON.stringify(e)}`);
                        }
                }
        }

        handleGenericProtocol(e) {
                const callbacks = this.mGenericProtocolListeners;
                console.assert(callbacks);
                for ( let cb in callbacks ) {
                        try {
                                callbacks[cb](e);
                        } catch (e) {
                                console.error(`Metax sync ` +
                                                `listener threw ` +
                                                `an assertion: ` +
                                                `${JSON.stringify(e)}`);
                        }
                }
        }

        /**
         *  @private
         */
        dispatchWebSocketMessage(e) {
            try {
                let msg = this.parseWebSocketEvent(e);
                if("event" in msg && "uuid" in msg) {
                        this.handleDBWebSocketMessage(e, msg);
                        return;
                } else if("event" in msg) {
                        this.handleMetaxEvents(e, msg);
                        return;
                }
            } catch (er) {
                console.log `Parse failed err=${er}`;
            }
            // TODO need to add sentto and test for it
            this.handleGenericProtocol(e.data)
        }

        /**
         * @private
         *  @todo: include Protocol.json (have C++ code include the same json, 
         *         and have same code-name for keys across C++ and JS),
         *         e.g. here the 'event' and 'uuid' fields are just a nuance
         */
        handleDBWebSocketMessage(e, msg) {
                console.assert('event' in msg, 'on-update message ' +
                               'from Metax should have "event" field');
                console.assert('uuid' in msg, 'on-update message ' +
                               'from Metax should have "uuid" field');
                const uuid = msg['uuid'];
                const ev = msg['event'];
                console.assert(this.isValidUUID(uuid),
                        `received on-update event with invalid uuid=${uuid}`);
                console.assert(this.mListeners && this.mListeners[uuid],
                        `no listener found for {uuid}`);
                console.assert( this.mListeners && this.mListeners[uuid],
                        `received on update for ${uuid} ` +
                        'but the listeners are missing for it');
                const callbacks = this.mListeners[uuid];
                console.assert(callbacks, `received on-update for ${uuid} ` +
                        'but the listner is not found');
                console.assert(callbacks.length > 0,
                        `listeners list for ${uuid} found but is empty`);
                for (let j in callbacks) {
                        try {
                                if(! callbacks[j].not_send_me) {
                                        callbacks[j].call(uuid,ev);
                                }
                        } catch (e) {
                                console.error('metax on-update handler threw' +
                                        ` an assertion: ${JSON.stringify(e)}`);
                                throw e;
                        }
                }
        }

        /**
         *  @private
         *  @todo: process error-code and turn into human-readable msg &
         *        links to documentation explaining details of error.
         */
        handleWebSocketClose(e) { 
                console.log('Metax websocket connection is closed with '+
                        `code: ${e.code} and reason: ${e.reason}`); 
                this.scheduleReconnect();
        }


        /**
         *  @private
         *  @todo: may have to look at error types and reconnect only on some,
         *        while for the others 
         *  @todo: it's not good to reconnect both during error and close
         */
        handleWebSocketError(e) {
                console.error(`Error in websocket: ${JSON.stringify(e)}`);
                console.dir(e);
                this.scheduleReconnect();
        }

        /**
         * @private
         * Schedule a reconnect during websocket drop
         * @todo need to do more diagnostics before just reconnecting
         */
        scheduleReconnect() {
                const seconds = 3000;
                console.log(`scheduling a reconnect in ${seconds} seconds`);
                console.assert(this.mEncryption);
                console.assert(['0','1'].indexOf(this.mEncryption) != -1);
                console.assert(this.mProtocol);
                console.assert(['http','https'].indexOf(this.mProtocol) != -1);
                setTimeout( () => {
                        this.connect(this.mHost,
                                     this.mPort,
                                     this.mEncryption === '1',
                                     this.mProtocol === 'https')
                        .catch(e => console.error("couldn't reconnect:",e)),
                        seconds;
                });
                console.log('scheduling:done');
        }

        /**
         *  @private
         *  @todo find a way to make all these methods private
         *         and thus also safely minimize/uglify them 
         *  @todo find out how Content-Type is set by the fetch() and 
         *        to which extent is it inferred correctly
         */
        async HTTPGet(url, token) {
                return fetch(url, {
                                method: 'GET',
                                headers: {
                                'Authorization' : "Metax-Auth " + token 
                                },
                                })
                        .then( async r => {
                                if (!r.ok) {
                                        throw 'response is not ok;\n json:' +
                                              JSON.stringify(await r.json());
                                }
                                return r;
                        }).catch( e => {
                                throw Error( `fetch(${url}) resulted in ` +
                                             `error:\n ${e}` );
                        });
        }

        /**
         *  @private
         */
        async HTTPPost(url,data,mime,token) {
                return fetch(url, {
                        method: 'POST',
                        headers: { 'Metax-Content-Type': mime,
                       'Authorization' : "Metax-Auth " + token },
                        body: data
                })
                .then( async r => {
                        if (r.status < 200 || r.status >= 300) {
                                throw await r.text();
                        }
                        return r.json();
                })
                .catch( e => {
                        throw Error(`fetch(${url}) resulted in error:\n ${e}`);
                });
        }

        /**
         * @summary Returns user keys: user public key, user private key,
         * user json key
         * @throws Error if the request to Metax server failed.
         */
        async get_user_keys() {
                const r = await this.HTTPGet(this.mGetUserKeysRequest,
                               this.mAccessToken)
                .catch( e => {
                        throw Error(`metax.HTTPGet(${this.mGetUserKeysRequest})`
                                + ` resulted in error:\n ${e}`);
                });
                const i = await r.json();
                console.assert(
                        "user_public_key" in i &&
                        "user_private_key" in i &&
                        "user_json_key" in i ,
                        `Error in getting metax user keys`
                      );
                return i;
        }

        /**
         * @summary Starts pairing mode
         * @throws Error if the request to Metax server failed.
         */
        async startPairing(timeout) {
                const url = this.mStartPairing + timeout;
                const r = await this.HTTPGet(url, this.mAccessToken)
                .catch( e => {
                        throw Error(`metax.HTTPGet(${url})`
                                + ` resulted in error:\n ${e}`);
                });
                const i = await r.json();
                return i;
        }

        /**
         * @summary Cancels pairing mode
         * @throws Error if the request to Metax server failed.
         */
        async cancelPairing() {
                await this.HTTPGet(this.mCancelPairing, this.mAccessToken)
                .catch( e => {
                        throw Error(`metax.HTTPGet(${this.mCancelPairing})`
                                + ` resulted in error:\n ${e}`);
                });
        }

        /**
         * @summary Returns peers that are in the same subnet and are in
         * pairing state.
         * @throws Error if the request to Metax server failed.
         */
        async getPairingPeers() {
                const r = await this.HTTPGet(this.mGetPairingPeers,
                                this.mAccessToken)
                .catch( e => {
                        throw Error(`metax.HTTPGet(${this.mGetPairingPeers})`
                                + ` resulted in error:\n ${e}`);
                });
                const i = await r.json();
                return i;
        }

        /**
         * @summary Connect to server for key transfer.
         * @param {IP} ip of the server
         * @param {CODE} code for verification
         * @throws Error if the request to Metax server failed.
         */
        async requestKeys(ip, code) {
                const url = this.mRequestKeysRequest + ip +
                        this.mRequestKeysRequestSecondParameter + code;
                const r = await this.HTTPGet(url, this.mAccessToken)
                .catch( e => {
                        throw Error(`metax.HTTPGet(${url})`
                                + ` resulted in error:\n ${e}`);
                });
                const i = await r.text();
                return i;
        }

        /**
         * @brief Regenerate new user keys (user public/private keys, user json encryption key). 
         * After new key generation the user and device json objects permanently are encrypted with new key and saved in corresponding files
         * @throws Error if the request to Metax server failed.
         */
        async regenerate_user_keys() {
                const r = await this.HTTPGet(this.mRegenerateUserKeysRequest,
                                this.mAccessToken)
                .catch( e => {
                        throw Error(`metax.HTTPGet(${this.mRegenerateUserKeysRequest})`+
                                ` resulted in error:\n ${e}`);
                });
                const l = await r.json();
                return l;
        }
};

metax = new Metax();

export default metax;
