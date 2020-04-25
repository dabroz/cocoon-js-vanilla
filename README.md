# cocoon-js-vanilla
Contains the Javascript dependency for the [cocoon](https://github.com/nathanvda/cocoon) rubygem without jQuery dependency. 

# Why
After two days of fighting with `cocoon:after-insert` not firing, I've decided to do the sane thing and re-write Cocoon JS to vanilla JS without Javascript.

# How to use 
- Install the [cocoon] rubygem as usual
- `yarn add cocoon-js-vanilla`
- In a JS file that relies on the cocoon javascript, import `cocoon-js-vanilla` at the top of the file

For example, if you're using webpacker and have an `application.js` entrypoint, you can do:
```js
// app/javascript/packs/application.js
import "cocoon-js-vanilla";
...

```

Inspired by https://github.com/joerodrig/cocoon-js

[cocoon]: https://github.com/nathanvda/cocoon
