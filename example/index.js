var ohboy = require('../');

var randomSource = next => produce => {
    if(next){
        throw "This is a source stream, but it was passed a `next` function"
    }

    setTimeout(() => {
        // every 100 ms, produce no error, a random number, and pass a function to call to get the next value (in this case, randomSource() again)
        produce(null, Math.random(), randomSource())
    }, 100);
};


var toFixed = places => next => produce => {
    if(!next){
        // No next value? The stream has ended. Propagate stream end downstream
        // No error, no value, no newNext
        produce(null, null, null); // Shorthand would be just produce()
        return;
    }

    next((error, item, newNext) => {
        if(error){
            // Propagate error downstream
            // Pass places and newNext into router so that downstream can request the next result if it wants
            produce(error, null, toFixed(places)(newNext));
            return;
        }

        // Do the work, pass in the setup toFixed function as newNext.
        produce(null, item.toFixed(places), toFixed(places)(newNext))
    })
};


var logDrain = label => next => produce => {
    if(!next){
        // No next value? The stream has ended.
        return;
    }

    next((error, item, newNext) => {

        if(produce){
            throw "This is a drain stream, but it was passed a `produce` function"
        }

        console.log(label, error, item);

        if(newNext) {
            logDrain(label)(newNext)();
        }
    })
};

var stream = ohboy([
    randomSource,
    toFixed(2),
    logDrain('First stream item:')
])

// Call our stream with no source and no destination
stream(null)(null); // Or just stream()()



// You could join the streams manually if you wanted to:

var stream2 = logDrain('Second stream item:')( /* Pulls from -> */ toFixed(5)( /* Pulls from -> */ randomSource() ) )

stream2();

// But that's hard to read..