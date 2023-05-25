/**
 * @param {Function(*)} done 
 * @returns 
 */
function GetTask(data, done) {
    return done();
}

/**
 * @param {Function(*)} done 
 * @returns 
 */
function ExecuteTask(data, done) {
    return done(data);
}

export {
    GetTask,
    ExecuteTask
}