const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('test', function() {
	return gulp.src('./test.js')
	.pipe(mocha({reporter:'nyan'}));
});