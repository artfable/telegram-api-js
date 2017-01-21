/**
 * Simple wrapper for using telegram api with js.
 *
 * @author artfable
 * 19.01.17
 */
;(function(factory) {
    var root = (typeof window == 'object' && window.window == window && window)
        || (typeof self == 'object' && self.self == self && self)
        || (typeof global == 'object' && global.global == global && global);
    factory(root, $.ajax);
})((root, ajax) => {
    'use strict';

    /**
     * Bot shouldn't do anything by himself, it just use call behaviors.
     */
    class TelegramBot {

        constructor(token, behaviors) {
            this._token = token;
            this._subscription = false;
            this._behaviors = behaviors || [];
            this._subscribedBehaviors = this._behaviors.filter((behavior) => behavior._subscribed);
            this._events = {};
        }

        startSubscription(interval, lastId, limits, filter) {
            this._subscription = true;
            this._behaviors.forEach(behavior => {behavior.start(this.sendAjax.bind(this))});

            this._getUpdates(interval, lastId, limits, filter);
        }

        stopSubscription() {
            this._subscription = false;
        }

        addListener(eventName, behavior) {
            let listeners = this._events[eventName] || {};
            listeners[behavior.constructor.name] = behavior;
            this._events = listeners;
        }

        removeListener(eventName, behavior) {
            let listeners = this._events[eventName];
            if (listeners) {
                delete listeners[behavior.constructor.name];
            }
        }

        fireEvent(eventName, params) {
            let listeners = this._events[eventName];
            if (listeners) {
                Object.entries(listeners).forEach(pair => {
                    pair[1].handle(eventName, params);
                });
            }
        }

        sendAjax(method, params) {
            return ajax(TelegramBot.API_URL + this._token + '/' + method.name, {
                method: method.type,
                // contentType: 'application/json',
                dataType: 'json',
                data: params
            });
        }

        _getUpdates(interval, lastId, limits, filter) {
            if (!this._subscription) {
                return;
            }

            setTimeout(() => {
                this.sendAjax(TelegramBot.METHODS.GET_UPDATES, {timeout: interval, offset: lastId ? lastId + 1 : null})
                    .done((response) => {

                        this._subscribedBehaviors.forEach(behavior => {behavior.parse(response, this.sendAjax.bind(this))});

                        let msgSize = response.result.length;
                        this._getUpdates(interval, msgSize ? response.result[msgSize - 1].update_id : null);
                    })
                    .fail((...args) => {
                        console.log(args);

                        this._getUpdates(interval, lastId);
                    })
                    .always((...args) => {
                        // console.debug(args);
                    });
            }, 0);
        }
    }

    /**
     * To allowed work from browser, as they don't allowed use variables in classes yet.
     *
     * @type {string}
     */
    TelegramBot.API_URL = 'https://api.telegram.org/bot';
    TelegramBot.METHODS = {
        GET_UPDATES: {
            name: 'getUpdates',
            type: 'GET'
        },
        SEND_MESSAGE: {
            name: 'sendMessage',
            type: 'POST'
        }
    };

    class BotBehavior {
        constructor(subscribed) {
            this._subscribed = subscribed;
        }

        parse(response, sendAjax) {}

        start(sendAjax) {}

        handle(eventName, params) {}
    }

    root.TelegramBot = TelegramBot;
    root.BotBehavior = BotBehavior;
});