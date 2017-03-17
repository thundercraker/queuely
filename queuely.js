/* Queuely is a simple event chaining manager
 * Author: Yumashish Subba 31st August 2016
 * License: GPL
 *
 * The objective of queuely is to allow many listeners to be assigned to an event but only call each listener
 * after the listener ahead of it has announced that it is finished. This will allow the creation of a properly
 * defined sequence of events. This will be aided by the fact that listeners are registered with certain levels of
 * precedence which will define it's order when it is registered. The lowest precedence listener will be executed first
 * with the exception of the master listener which is always executed last.
 *
 * event chain <= the full sequence of listeners that follow the main event
 * master event <= the first event in a chain
 * master listener <= the master listener is the callback that is invoked when the event chain completes
 * actual event name <= slaves to a master event name are given UIDs, this also serves as the event that they are bound to (listen for)
 *
 * IMPORTANT: Listeners will be passed the QueryBundle as part of its context (this). For example to announce the job is finished
 * the listener can call this.Finish() and to access the passed data it can use this.data. The data is NOT passed as an argument
 * to the listener
 */
Queuely = function () {
    // [uid] => {listener function, master event name, next event name, precedence}
    this._listeners = {}        //Collection of 4ples
    // [master event name] => [slave_uid_0, slave_uid_1, ...]
}

/* Each listener is passed this object instead of just data
 *
 * Listeners are expected to call Finish() when it's job is complete so that the next event in the
 * event queue can be fired. Calling finish multiple times will almost certainly lead to data inconsistancy
 * as Queuely does not check if multiple event chains are running
 *
 * Constructor: (watcher, actual, data, [optional] flags)
 */
QueuelyBundle = function (watcher, actual, data) {
    this.actual = actual;                                   //The actual event name
    this.watcher = watcher;                                 //The Queuely object to which the listener is registered
    this.data = data;                                       //The data passed to the listener
    this.flags = (arguments[3]) ? arguments[3] : []         //Flags (used for termination status etc)
    this.Finish = function () {                //Called when the listener's job is complete
        watcher.Finish(this);
    }
}

/* Terminate
 *
 * Terminates the current chain, may or may not call the master
 *
 * hard     (boolean) if true will terminate without calling master,
 *          if false [default] will terminate and call master
 */
 Queuely.prototype.Terminate = function(bundle, hard) {
     var opt_hard = (hard) ? hard : false;
     if(!opt_hard) {
         bundle.flags['PREMATURE_TERMINATION'] = 1;
         this._listeners[this._listeners[bundle.actual].master].listener.apply(bundle);
     }
 }

/* Finish
 *
 * Retreives the next event in the chain and emits it
 *
 * uid      the actual event name of this listener
 * data     data passed to the listener
 *
 * Returns nothing
 */
Queuely.prototype.Finish = function (bundle) {
    var nextEventName = this._listeners[bundle.actual].next;
    if (nextEventName) {
        if (!this.emit(nextEventName, bundle.data)) {
            //could not find the event call master immediately with termination flag
            bundle.flags['PREMATURE_TERMINATION'] = 1;
            this._listeners[this._listeners[bundle.actual].master].listener.apply(bundle);
        }
    } else {
        //chain has ended, call master listener for callback
        bundle.flags['COMPLETE_TERMINATION'] = 1;
        this._listeners[this._listeners[bundle.actual].master].listener.apply(bundle);
    }
}

/* emit
 *
 * Call the listener for an event. Unlike the normal EventEmitter, this will only fire a single event as it expects
 * the listener to call the next event using Finish
 *
 * eventName            the event name of this listener
 * param1, param2...    data passed to the listener
 *
 * Returns true if listener callback succeeded, flase if not
 */
Queuely.prototype.emit = function() {
    if(arguments.length < 1) return false;

    var eventName = arguments[0];
    var listener = this._listeners[eventName];
    if(!listener) return false;

    if(listener.master == null) {
        //console.log(data);

        var data = [];
        for(var i = 1; i < arguments.length; i++) {
            data.push(arguments[i]);
        }

        var next = this._listeners[listener.next];
        if(next) next.listener.apply(new QueuelyBundle(this, listener.next, data));
        else listener.listener.apply(new QueuelyBundle(this, eventName, data));
    } else {
        //console.log(data);var data = [];
        listener.listener.apply(new QueuelyBundle(this, eventName, arguments[1]));
    }
    return true;
}

/* GetUID
 *
 * Generate a randomized identification string for a given string, doesn't need to the bassed anything
 *
 * opt. string      string to randomize
 *
 * Returns string
 */
Queuely.prototype.GetUID = function () {
    var string = (arguments[0]) ? arguments[0] : '';
    var hash = function (str) {
        // Convert to 32bit integer hash
        var hash = 0, i, chr, len;
        if (str.length === 0) return hash;
        for (i = 0, len = str.length; i < len; i++) {
            chr = str.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    };

    var salt = Math.floor((Math.random() * 34000)) + '' + (new Date().getTime());
    return hash(string + salt);
}

/* eventNames
 *
 * Gets the master event names
 *
 * Returns Collection where key => name and content is null
 */
Queuely.prototype.eventNames = function () {
    var names = {};
    for (key in this._listeners) {
        var l = this._listeners[key];
        if(l.master == null) names[key] = 0;
    }
    return names;
}

/* listenerCount
 *
 * Number of listeners for the given master event name
 *
 * visibleEventName     master event name
 *
 * Returns number
 */
Queuely.prototype.followerCount = function (eventName) {
    if (!this._listeners[eventName]) return 0;
    else {
        var count = 0;
        var current = this._listeners[eventName];
        while(current.next) {
            current = this._listeners[current.next];
            count++;
        }
        return count;
    }
}

/* followers
 *
 * Retrives a list of listener fucntions that follow the given event
 *
 * visibleEventName     master event name
 *
 * Returns list of listener functions
 */
Queuely.prototype.followers = function(eventName) {
    var listeners = [];
    if (!this._listeners[eventName]) return 0;
    else {
        var current = this._listeners[eventName];
        while(current.next) {
            current = this._listeners[current.next];
            listeners.push(current.listener);
        }
        return listeners;
    }
}

/* on
 *
 * Registers a listener to the given master event name, will append to the end of the event chain
 *
 * masterEvent      master event name
 * listener         listener function
 *
 * Returns string
 */
Queuely.prototype.on = function (masterEvent, listener) {
    var precedence = (arguments[2]) ? arguments[2] : 100;

    if (!this._listeners[masterEvent]) {
        this._listeners[masterEvent] = { listener: listener, master: null, next: null, precedence: -1 }
        return masterEvent;
    } else {
        var currentListener = this._listeners[masterEvent];;
        while(currentListener.next && currentListener.precedence <= precedence) {
            var uidOfNextListener = currentListener.next;
            var currentListener = this._listeners[uidOfNextListener];
        }

        var slaveEvent = this.GetUID(masterEvent);
        this._listeners[slaveEvent] = { listener: listener, master: masterEvent, next: null, precedence: precedence };
        currentListener.next = slaveEvent;
        return slaveEvent;
    }
}

/* after
 *
 * Register a listers after a given actual listener name
 *
 * prevEvent        actual name of the previous event
 * listener         listener function
 *
 * Returns string if successfull, null if not
 */
Queuely.prototype.after = function (prevEvent, listener) {
    var infront = this._listeners[prevEvent];
    if (!infront) return null;

    var newEventName = this.GetUID(prevEvent);
    var newListener = { listener:listener, master:(infront.master) ? infront.master : prevEvent, next:null };
    this._listeners[newEventName] = newListener;

    var next = this._listeners[infront.next];
    if (next) {
        newListener.next = infront.next;
    }
    infront.next = newEventName;
    return newEventName;
}

Queuely.prototype.removeMaster = function(masterEvent) {
    if(this._listeners[masterEvent]) {
        keylist = [masterEvent];
        var current = this._listeners[masterEvent];
        while(current.next) {
            keylist.push(current.next);
            current = this._listeners[current.next];
        }
        for(var i = 0; i < keylist.length; i++) {
            delete this._listeners[keylist[i]];
        }

        return true;
    }
    return false;
}

Queuely.prototype.remove = function (eventName) {
    if(this._listeners[eventName] && this._listeners[eventName].master == null) return this.removeMaster(eventName);
    if(this._listeners[eventName]) {
        var master = this._listeners[eventName].master;
        var current = this._listeners[master];
        while(current.next) {
            var name = current.next;
            if(name == eventName) {
                var next = this._listeners[name].next;
                current.next = next;
                delete this._listeners[eventName];
                return true;
            }
            current = this._listeners[current.next];
        }
    }
    return false;
};

var module = module || {}
module.exports = Queuely;
