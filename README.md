# Tartlet

Dependently-typed language (baking little pie) in javascript.

- based on:
  - "The little typer"
    - by Daniel P. Friedman and David Thrane Christiansen
  - "Checking Dependent Types with Normalization by Evaluation: A Tutorial"
    - by David Thrane Christiansen
    - origin tutorial at :: http://davidchristiansen.dk/tutorials/nbe

## Modules

- `npm install tartlet`

- [API Docs](https://api.tartlet.now.sh)

## Community

- We enforce C4 as collaboration protocol -- [The C4 RFC](https://rfc.zeromq.org/spec:42/C4)
- [Style Guide](STYLE-GUIDE.md) -- observe the style of existing code and respect it
- [Code of Conduct](CODE-OF-CONDUCT.md)
- Source code -- [github](https://github.com/xieyuheng/tartlet), [gitlab](https://gitlab.com/xieyuheng/tartlet)
- IRC -- [#cicada-language](https://kiwiirc.com/nextclient/irc.freenode.net/#cicada-language)
- CI -- [gitlab-ci](https://gitlab.com/xieyuheng/tartlet/pipelines)
- Related Project
  - [baozi](https://github.com/xieyuheng/baozi) -- dependently-typed language in scala

## Contributing

- Prepare: `npm install`
- Compile: `npx tsc`
- Compile and watch: `npx tsc --watch`
- Run all tests: `npx ava`
- Run specific test file: `npx ava -sv <path to the test file>`

## License

- [GPLv3](LICENSE)
