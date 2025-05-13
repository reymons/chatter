import crypto from "crypto";

export default class IdManager {
    #id = {};
    #hash = {};

    hash(id) {
        if (this.#hash[id]) {
            return this.#hash[id];
        }

        const hash = crypto
            .createHash("sha256")
            .update(id.toString())
            .digest("hex")
            .substring(0, 8);

        this.#id[hash] = id;
        this.#hash[id] = hash;
        return hash;
    }

    id(hash) {
        return this.#id[hash] ?? -1;
    }
}
