# Tartlet

Dependently-typed language embedded in javascript.

- based on:
  - "The little typer"
    - by Daniel P. Friedman and David Thrane Christiansen
  - "Checking Dependent Types with Normalization by Evaluation: A Tutorial"
    - by David Thrane Christiansen
    - origin http://davidchristiansen.dk/tutorials/nbe

## Community

- We enforce C4 as collaboration protocol -- [The C4 RFC](https://rfc.zeromq.org/spec:42/C4)
- [Style Guide](STYLE-GUIDE.md) -- observe the style of existing code and respect it
- [Code of Conduct](CODE-OF-CONDUCT.md)
- Source code -- [github](https://github.com/xieyuheng/tartlet), [gitlab](https://gitlab.com/xieyuheng/tartlet)
- [cicada-rs](http://github.com/xieyuheng/cicada-rs) -- an old version of the same project written in rust
- IRC -- [#cicada-language](https://kiwiirc.com/nextclient/irc.freenode.net/#cicada-language)
- CI -- [gitlab-ci](https://gitlab.com/xieyuheng/tartlet/pipelines)

## Contributing

- Prepare: `npm install`
- Compile: `npx tsc`
- Compile and watch: `npx tsc --watch`
- Run all tests: `npx ava`
- Run specific test file: `npx ava -sv <path to the test file>`

## License

- [GPLv3](LICENSE)
