var test = require('tape');
var ohboy = require('../');

var items = [1,2,1,0,3,0,2,2,5,6,0,6,3,2,0];

var values = (items, index = 0) => next => produce => {
    if(!produce){
        return;
    }

    if(index >= items.length){
        return produce();
    }

    setTimeout(function(){
        produce(null, items[index], values(items, index + 1)());
    }, 50);
};

var random = next => produce => {
    produce && produce(null, Math.random(), random());
};

var filter = check => next => produce => {
    next(produce && function(error, item, newNext){
        if(error || check(item) || !newNext){
            return produce(error, item, newNext && filter(check)(newNext));
        }

        filter(check)(newNext)(produce);
    });
};

var limit = max => next => produce => {
    if(!produce){
        return next();
    }

    if(max <= 0){
        next(); // cancel upstream
        produce(); // end downstream
        return;
    }

    next(function(error, item, newNext){
        produce(error, item, newNext && limit(max - 1)(newNext));
    });
};

var map = mapper => next => produce => {
    next(produce && function(error, item, newNext){
        produce(error, !error && mapper(item), newNext && map(mapper)(newNext));
    });
};

var concat = (all = []) => next => produce => {
    next(produce && function(error, item, newNext){
        if(error || !newNext){
            return produce(error, all);
        }

        concat(all.concat(item))(newNext)(produce);
    });
}

test('pull filter limit', function(t){

    t.plan(1);

    var stream = ohboy([
        values(items),
        filter(x => x),
        limit(10),
        concat()
    ]);

    var expected =
        items
        .filter(x => x)
        .slice(0, 10)

    stream()(function(error, result){
        t.deepEqual(result, expected);
    });
});

test('pull random filter limit', function(t){

    t.plan(1);

    var stream = ohboy([
        random,
        map(Math.round),
        filter(x => x),
        limit(10),
        concat()
    ]);

    var expected = Array.apply(null, {length: 10}).map(x => 1);

    stream()(function(error, result){
        t.deepEqual(result, expected);
    });
});

test('error', function(t){

    t.plan(1);

    var stream = ohboy([
        next => produce => produce('error'),
        filter(x => x),
        limit(10),
        concat()
    ]);

    stream()(function(error){
        t.equal(error, 'error');
    });
});

test('cancel', function(t){

    t.plan(1);

    var stream = ohboy([
        values(items),
        map(t.pass),
        next => produce => (next(() => {}), next()),
        limit(10),
        concat()
    ]);

    stream()(function(error){
        t.fail('canceled, should not hit');
    });
});

test('cancel at 5 and return results', function(t){

    t.plan(1);

    var expected =
        items
        .slice(0, 5)

    var stream = ohboy([
        values(items),
        limit(5),
        concat()
    ]);

    stream()(function(error, result){
        t.deepEqual(result, expected);
    });
});