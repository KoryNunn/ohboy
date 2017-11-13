
function ohboy(parts){
    return function(source){
        return parts.slice(1).reduce(function(source, destination){
            return destination(source);
        }, parts[0](source));
    };
}

module.exports = ohboy;