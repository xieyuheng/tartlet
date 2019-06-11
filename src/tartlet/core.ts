import assert from "assert"
import * as ut from "cicada-lang/lib/util"
import { result_t, ok_t, err_t } from "cicada-lang/lib/result"
import { option_t, some_t, none_t } from "cicada-lang/lib/option"

export
class env_t {
  map: Map <string, value_t>

  constructor (
    map: Map <string, value_t> = new Map ()
  ) {
    this.map = map
  }

  find (name: string): option_t <value_t> {
    let value = this.map.get (name)
    if (value !== undefined) {
      return new some_t (value)
    } else {
      return new none_t ()
    }
  }

  copy (): env_t {
    return new env_t (new Map (this.map))
  }

  ext (name: string, value: value_t): env_t {
    return new env_t (
      new Map (this.map)
        .set (name, value)
    )
  }
}

export
abstract class closure_t {
  closure_tag: "closure_t" = "closure_t"

  abstract name: string
}

export
class native_closure_t extends closure_t {
  name: string
  fun: (value: value_t) => value_t

  constructor (
    name: string,
    fun: (value: value_t) => value_t,
  ) {
    super ()
    this.name = name
    this.fun = fun
  }
}

export
class env_closure_t extends closure_t {
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
}

export
abstract class exp_t {
  exp_tag: "exp_t" = "exp_t"

  // TODO
  // abstract alpha_eq (
  //   that: exp_t,
  //   this_map: Map <string, string>,
  //   that_map: Map <string, string>,
  // ): boolean
}

// <expr> ::=
//   <id>
//   | ( Pi ( ( <id> <expr> ) ) <expr> )
//   | ( lambda ( <id> ) <expr> )
//   | ( <expr> <expr> )
//   | ( Sigma ( ( <id> <expr> ) ) <expr> )
//   | ( cons <expr> <expr> )
//   | ( car <expr> )
//   | ( cdr <expr> )
//   | Nat
//   | zero
//   | ( add1 <expr> )
//   | ( ind-Nat <expr> <expr> <expr> <expr> )
//   | ( = <expr> <expr> <expr> )
//   | same
//   | ( replace <expr> <expr> <expr> )
//   | Trivial
//   | sole
//   | Absurd
//   | ind-Absurd
//   | Atom
//   | ( quote <id> )
//   | U
//   | ( the <expr> <expr> )

export
class exp_var_t extends exp_t {
  name: string

  constructor (name: string) {
    super ()
    this.name = name
  }
}

export
class exp_pi_t extends exp_t {
  v: string
  arg_type: exp_t
  ret_type: exp_t

  constructor (
    v: string,
    arg_type: exp_t,
    ret_type: exp_t,
  ) {
    super ()
    this.v = v
    this.arg_type = arg_type
    this.ret_type = ret_type
  }
}

export
class exp_lambda_t extends exp_t {
  v: string
  body: exp_t

  constructor (
    v: string,
    body: exp_t,
  ) {
    super ()
    this.v = v
    this.body = body
  }
}

export
class exp_apply_t extends exp_t {
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
}

export
class exp_sigma_t extends exp_t {
  v: string
  car_type: exp_t
  cdr_type: exp_t

  constructor (
    v: string,
    car_type: exp_t,
    cdr_type: exp_t,
  ) {
    super ()
    this.v = v
    this.car_type = car_type
    this.cdr_type = cdr_type
  }
}

export
class exp_cons_t extends exp_t {
  car: exp_t
  cdr: exp_t

  constructor (
    car: exp_t,
    cdr: exp_t,
  ) {
    super ()
    this.car = car
    this.cdr = cdr
  }
}

export
class exp_car_t extends exp_t {
  pair: exp_t

  constructor (
    pair: exp_t,
  ) {
    super ()
    this.pair = pair
  }
}

export
class exp_cdr_t extends exp_t {
  pair: exp_t

  constructor (
    pair: exp_t,
  ) {
    super ()
    this.pair = pair
  }
}

export
class exp_nat_t extends exp_t {
  constructor () {
    super ()
  }
}

export
class exp_zero_t extends exp_t {
  constructor () {
    super ()
  }
}

export
class exp_add1_t extends exp_t {
  prev: exp_t

  constructor (
    prev: exp_t,
  ) {
    super ()
    this.prev = prev
  }
}

export
class exp_ind_nat_t extends exp_t {
  t: exp_t
  target: exp_t
  base: exp_t
  step: exp_t

  constructor (
    t: exp_t,
    target: exp_t,
    base: exp_t,
    step: exp_t,
  ) {
    super ()
    this.t = t
    this.target = target
    this.base = base
    this.step = step
  }
}

export
class exp_eqv_t extends exp_t {
  t: exp_t
  from: exp_t
  to: exp_t

  constructor (
    t: exp_t,
    from: exp_t,
    to: exp_t,
  ) {
    super ()
    this.t = t
    this.from = from
    this.to = to
  }
}

export
class exp_same_t extends exp_t {
  constructor () {
    super ()
  }
}

export
class exp_replace_t extends exp_t {
  t: exp_t
  from: exp_t
  to: exp_t

  constructor (
    t: exp_t,
    from: exp_t,
    to: exp_t,
  ) {
    super ()
    this.t = t
    this.from = from
    this.to = to
  }
}

export
class exp_trivial_t extends exp_t {
  constructor () {
    super ()
  }
}

export
class exp_sole_t extends exp_t {
  constructor () {
    super ()
  }
}

export
class exp_absurd_t extends exp_t {
  constructor () {
    super ()
  }
}

export
class exp_ind_absurd_t extends exp_t {
  constructor () {
    super ()
  }
}

export
class exp_atom_t extends exp_t {
  constructor () {
    super ()
  }
}

export
class exp_quote_t extends exp_t {
  sym: string

  constructor (
    sym: string
  ) {
    super ()
    this.sym = sym
  }
}

export
class exp_universe_t extends exp_t {
  constructor () {
    super ()
  }
}

export
class exp_the_t extends exp_t {
  t: exp_t
  value: exp_t

  constructor (
    t: exp_t,
    value: exp_t,
  ) {
    super ()
    this.t = t
    this.value = value
  }
}

export
abstract class value_t {
  value_tag: "value_t" = "value_t"
}

export
class value_pi_t extends value_t {
  arg_type: value_t
  ret_type: closure_t

  constructor (
    arg_type: value_t,
    ret_type: closure_t,
  ) {
    super ()
    this.arg_type = arg_type
    this.ret_type = ret_type
  }
}

export
class value_lambda_t extends value_t {
  body: closure_t

  constructor (
    body: closure_t,
  ) {
    super ()
    this.body = body
  }
}

export
class value_sigma_t extends value_t {
  car_type: value_t
  cdr_type: closure_t

  constructor (
    car_type: value_t,
    cdr_type: closure_t,
  ) {
    super ()
    this.car_type = car_type
    this.cdr_type = cdr_type
  }
}

export
class value_pair_t extends value_t {
  car: value_t
  cdr: value_t

  constructor (
    car: value_t,
    cdr: value_t,
  ) {
    super ()
    this.car = car
    this.cdr = cdr
  }
}

export
class value_nat_t extends value_t {
  constructor (
  ) {
    super ()
  }
}

export
class value_zero_t extends value_t {
  constructor (
  ) {
    super ()
  }
}

export
class value_add1_t extends value_t {
  prev: value_t

  constructor (
    prev: value_t,
  ) {
    super ()
    this.prev = prev
  }
}

export
class value_eqv_t extends value_t {
  t: value_t
  from: value_t
  to: value_t

  constructor (
    t: value_t,
    from: value_t,
    to: value_t,
  ) {
    super ()
    this.t = t
    this.from = from
    this.to = to
  }
}

export
class value_same_t extends value_t {
  constructor (
  ) {
    super ()
  }
}

export
class value_trivial_t extends value_t {
  constructor (
  ) {
    super ()
  }
}

export
class value_sole_t extends value_t {
  constructor (
  ) {
    super ()
  }
}

export
class value_absurd_t extends value_t {
  constructor (
  ) {
    super ()
  }
}

export
class value_atom_t extends value_t {
  constructor (
  ) {
    super ()
  }
}

export
class value_quote_t extends value_t {
  sym: string

  constructor (
    sym: string
  ) {
    super ()
    this.sym = sym
  }
}

export
class value_universe_t extends value_t {
  constructor (
  ) {
    super ()
  }
}

export
class the_neutral_t extends value_t {
  t: value_t
  neutral: neutral_t

  constructor (
    t: value_t,
    neutral: neutral_t,
  ) {
    super ()
    this.t = t
    this.neutral = neutral
  }
}

export
abstract class neutral_t {
  neutral_tag: "neutral_t" = "neutral_t"
}

export
class neutral_var_t extends neutral_t {
  name: string

  constructor (
    name: string,
  ) {
    super ()
    this.name = name
  }
}

export
class neutral_apply_t extends neutral_t {
  fun: neutral_t
  arg: the_value_t

  constructor (
    fun: neutral_t,
    arg: the_value_t,
  ) {
    super ()
    this.fun = fun
    this.arg = arg
  }
}

export
class neutral_car_t extends neutral_t {
  pair: neutral_t

  constructor (
    pair: neutral_t
  ) {
    super ()
    this.pair = pair
  }
}

export
class neutral_cdr_t extends neutral_t {
  pair: neutral_t

  constructor (
    pair: neutral_t
  ) {
    super ()
    this.pair = pair
  }
}

export
class neutral_ind_nat_t extends neutral_t {
  target: neutral_t
  motive: the_value_t
  base: the_value_t
  step: the_value_t

  constructor (
    target: neutral_t,
    motive: the_value_t,
    base: the_value_t,
    step: the_value_t,
  ) {
    super ()
    this.target = target
    this.motive = motive
    this.base = base
    this.step = step
  }
}

export
class neutral_replace_t extends neutral_t {
  target: neutral_t
  motive: the_value_t
  base: the_value_t

  constructor (
    target: neutral_t,
    motive: the_value_t,
    base: the_value_t,
  ) {
    super ()
    this.target = target
    this.motive = motive
    this.base = base
  }
}

export
class neutral_ind_absurd_t extends neutral_t {
  target: neutral_t
  motive: the_value_t

  constructor (
    target: neutral_t,
    motive: the_value_t,
  ) {
    super ()
    this.target = target
    this.motive = motive
  }
}

export
class the_value_t {
  t: value_t
  value: value_t

  constructor (
    t: value_t,
    value: value_t,
  ) {
    this.t = t
    this.value = value
  }
}
