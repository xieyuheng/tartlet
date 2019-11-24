import assert from "assert"
import * as ut from "@cicadoidea/basic/lib/util"
import { result_t, ok_t, err_t } from "@cicadoidea/basic/lib/result"
import { option_t, some_t, none_t } from "@cicadoidea/basic/lib/option"

export
abstract class value_t {
  value_t: "value_t" = "value_t"

  abstract read_back (used_names: Set <string>): exp_t
}

/**
 * Runtime environments provide the values for each variable.
 */
export
class env_t {
  map: Map <string, value_t>

  constructor (
    map: Map <string, value_t> = new Map ()
  ) {
    this.map = map
  }

  lookup_value (name: string): option_t <value_t> {
    let value = this.map.get (name)
    if (value !== undefined) {
      return new some_t (value)
    } else {
      return new none_t ()
    }
  }

  ext (name: string, value: value_t): env_t {
    return new env_t (new Map (this.map) .set (name, value))
  }
}

export
class closure_t extends value_t {
  env: env_t
  name: string
  body: exp_t

  constructor (
    env: env_t,
    name: string,
    body: exp_t,
  ) {
    super ()
    this.env = env
    this.name = name
    this.body = body
  }

  read_back (used_names: Set <string>): exp_t {
    let fresh_name = freshen (
      used_names,
      this.name)
    return new lambda_t (
      fresh_name,
      this.body.eval (
        this.env.ext (this.name, new neutral_var_t (fresh_name)))
        .read_back (new Set (used_names) .add (fresh_name)))
  }
}

export
abstract class exp_t {
  exp_t: "exp_t" = "exp_t"

  abstract eq (that: exp_t): boolean
  abstract eval (env: env_t): value_t
}

export
class lambda_t extends exp_t {
  name: string
  body: exp_t

  constructor (
    name: string,
    body: exp_t,
  ) {
    super ()
    this.name = name
    this.body = body
  }

  eq (that: exp_t): boolean {
    return that instanceof lambda_t
      && this.name === that.name
      && this.body.eq (that.body)
  }

  eval (env: env_t): closure_t {
    return new closure_t (env, this.name, this.body)
  }
}

export
class var_t extends exp_t {
  name: string

  constructor (name: string) {
    super ()
    this.name = name
  }

  eq (that: exp_t): boolean {
    return that instanceof var_t
      && this.name === that.name
  }

  eval (env: env_t): value_t {
    return env.lookup_value (this.name) .unwrap_or_throw (
      new Error (`undefined name: ${this.name}`))
  }
}

export
class apply_t extends exp_t {
  rator: exp_t
  rand: exp_t

  constructor (
    rator: exp_t,
    rand: exp_t,
  ) {
    super ()
    this.rator = rator
    this.rand = rand
  }

  eq (that: exp_t): boolean {
    return that instanceof apply_t
      && this.rator.eq (that.rator)
      && this.rand.eq (that.rand)
  }

  eval (env: env_t): value_t {
    let fun = this.rator.eval (env)
    let arg = this.rand.eval (env)

    if (fun instanceof closure_t) {
      return fun.body.eval (fun.env.ext (fun.name, arg))
    } else if (fun instanceof neutral_t) {
      return new neutral_apply_t (fun, arg)
    } else {
      throw new Error (`unknown fun value: ${fun}`)
    }
  }
}

export
class module_t {
  env: env_t

  constructor (
    env: env_t = new env_t (),
  ) {
    this.env = env
  }

  /** `use` means "import all from" */
  use (other: module_t): this {
    for (let [name, value] of other.env.map.entries ()) {
      this.env.lookup_value (name) .match ({
        some: _value => {
          throw new Error (`name already defined: ${name}`)
        },
        none: () => {
          this.env.map.set (name, value)
        },
      })
    }
    return this
  }

  define (name: string, exp: exp_t): this {
    this.env = this.env.ext (name, exp.eval (this.env))
    return this
  }

  run (exp: exp_t): exp_t {
    return exp.eval (this.env) .read_back (new Set ())
  }
}

export
function freshen (
  used_names: Set <string>,
  name: string,
): string {
  while (used_names.has (name)) {
    name += "*"
  }
  return name
}

export
abstract class neutral_t extends value_t {
  neutral_t: "neutral_t" = "neutral_t"

  constructor () {
    super ()
  }
}

export
class neutral_var_t extends neutral_t {
  name: string

  constructor (name: string) {
    super ()
    this.name = name
  }

  read_back (used_names: Set <string>): exp_t {
    return new var_t (this.name)
  }
}

export
class neutral_apply_t extends neutral_t {
  rator: neutral_t
  rand: value_t

  constructor (
    rator: neutral_t,
    rand: value_t,
  ) {
    super ()
    this.rator = rator
    this.rand = rand
  }

  read_back (used_names: Set <string>): exp_t {
    return new apply_t (
      this.rator.read_back (used_names),
      this.rand.read_back (used_names))
  }
}

// Example: Church Numerals

export
let church = new module_t ()

// (define church-zero
//  (lambda (f)
//   (lambda (x)
//    x)))

// (define church-add1
//  (lambda (prev)
//   (lambda (f)
//    (lambda (x)
//     (f ((prev f) x))))))

// (define church-add
//  (lambda (j)
//   (lambda (k)
//    (lambda (f)
//     (lambda (x)
//      ((j f) ((k f) x)))))))

// TODO
// parser for the following js-like syntax

// church_zero = (f) => (x) => x
// church_add1 = (prev) => (f) => (x) => f (prev (f) (x))
// church_add = (j) => (k) => (f) => (x) => j (f) (k (f) (x))

// with currying
// church_zero = (f, x) => x
// church_add1 = (prev, f, x) => f (prev (f, x))
// church_add = (j, k, f, x) => j (f, k (f, x))

church.define (
  "church_zero", new lambda_t (
    "f", new lambda_t (
      "x", new var_t ("x"))))

church.define (
  "church_add1", new lambda_t (
    "prev", new lambda_t (
      "f", new lambda_t (
        "x", new apply_t (
          new var_t ("f"),
          new apply_t (
            new apply_t (
              new var_t ("prev"),
              new var_t ("f")),
            new var_t ("x")))))))

church.define (
  "church_add", new lambda_t (
    "j", new lambda_t (
      "k", new lambda_t (
        "f", new lambda_t (
          "x", new apply_t (
            new apply_t (
              new var_t ("j"),
              new var_t ("f")),
            new apply_t (
              new apply_t (
                new var_t ("k"),
                new var_t ("f")),
              new var_t ("x"))))))))

export
function to_church (n: number): exp_t {
  let exp: exp_t = new var_t ("church_zero")
  while (n > 0) {
    exp = new apply_t (new var_t ("church_add1"), exp)
    n -= 1
  }
  return exp
}
