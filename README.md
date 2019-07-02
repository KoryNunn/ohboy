# OhBoy

Here I go, reinventing the wheel again..

## Pullstreams but different

mutationless lazy streaming.

This module is just a way to join streams, the streams themselves are just a pattern, and require no library to use.

pipeline methods are of the signature:

```javascript
    (any...) => sourceNext(error, result, newNext) => destination(error, result, newNext)
```

where:
 - `(any...)` Optional, initialises a piece into its next state for producing a value
 - `sourceNext(error, result, newNext)` is used to get the next value
 - `destination(error, result, newNext)` is used to pass a result (error or success) AND a method to call for the next value

## Usage (of ohboy)

[Working example]('./example/index.js)

ohboy is used to join streams together:

```js
var ohboy = require('ohboy');

var stream = ohboy([stream, stream, stream...]);
```

`stream` is just another `next => produce => ...` pattern function, and so, can be used in another stream

## Propagate end of stream

A piece knows its upstream has no more data if it doesn't pass a `next` function.
Generally only sinks act on this state, as upstream pieces won't be called once the sink knows there's nothing left to ask for.

```javascript
var concat = (all = []) => next => produce => {
    next(produce && function(error, item, newNext){

        // If there is nothing left to get, the stream is complete.
        if(error || !newNext){
            return produce(error, all);
        }

        concat(all.concat(item))(newNext)(produce);
    });
}
```

## Propagate cancelation

A piece knows its downstream doesn't want any more data if it doesn't pass a `produce` function.

```javascript
var limit = max => next => produce => {
    // something downstream doesn't want more data, just propagate that message upstream.
    if(!produce){
        return next();
    }

    // We have enough data, don't produce more, and let downstream know we are done.
    if(max <= 0){
        next(); // cancel upstream
        produce(); // end downstream
        return;
    }

    next(function(error, item, newNext){
        produce(error, item, newNext && limit(max - 1)(newNext));
    });
};
```