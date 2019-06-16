import assert from "assert"
import nanoid from "nanoid"
import * as ut from "cicada-lang/lib/util"
import { result_t, ok_t, err_t } from "cicada-lang/lib/result"
import { option_t, some_t, none_t } from "cicada-lang/lib/option"

export
abstract class den_t {
  den_t: "den_t" = "den_t"
}

export
class def_t extends den_t {
  t: value_t
  value: value_t

  constructor (
    t: value_t,
    value: value_t,
  ) {
    super ()
    this.t = t
    this.value = value
  }
}

export
class bind_t extends den_t {
  t: value_t

  constructor (
    t: value_t,
  ) {
    super ()
    this.t = t
  }
}

export
class ctx_t {
  map: Map <string, den_t>

  constructor (
    map: Map <string, den_t> = new Map ()
  ) {
    this.map = map
  }

  lookup_type (name: string): option_t <value_t> {
    let den = this.map.get (name)
    if (den instanceof def_t &&
        den instanceof bind_t) {
      return new some_t (den.t)
    } else {
      return new none_t ()
    }
  }

  lookup_value (name: string): option_t <value_t> {
    let den = this.map.get (name)
    if (den instanceof def_t) {
      return new some_t (den.value)
    } else if (den instanceof bind_t) {
      return new some_t (
        new the_neutral_t (
          den.t,
          new neutral_var_t (name),
        )
      )
    } else {
      return new none_t ()
    }
  }

  copy (): ctx_t {
    return new ctx_t (new Map (this.map))
  }

  ext (name: string, den: den_t): ctx_t {
    return new ctx_t (
      new Map (this.map)
        .set (name, den)
    )
  }

  names (): Set <string> {
    return new Set (this.map.keys ())
  }

  to_env (): env_t {
    let map = new Map ()
    for (let [name, den] of this.map.entries ()) {
      if (den instanceof def_t) {
        map.set (name, den.value)
      } else if (den instanceof bind_t) {
        map.set (
          name, new the_neutral_t (
            den.t,
            new neutral_var_t (name),
          )
        )
      } else {
        throw new Error (
          `unknow type of den_t ${den.constructor.name}`
        )
      }
    }
    return new env_t (map)
  }
}

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
  closure_t: "closure_t" = "closure_t"

  abstract name: string

  abstract apply (value: value_t): value_t
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

  apply (value: value_t): value_t {
    return this.fun (value)
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

  apply (value: value_t): value_t {
    return this.body.eval (
      this.env.ext (this.name, value)
    )
  }
}

export
abstract class exp_t {
  exp_t: "exp_t" = "exp_t"

  /**
   * Equivalence after consistently replacing bound variables.
   */
  abstract alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean

  abstract eval (env: env_t): value_t
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
//   | ( ind-Absurd <expr> <expr> )
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

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_var_t) {
      let this_sym = this_map.get (this.name)
      let that_sym = that_map.get (that.name)
      if (this_sym === undefined &&
          that_sym === undefined) {
        return this.name === that.name
      } else if (this_sym !== undefined &&
                 that_sym !== undefined) {
        return this_sym === that_sym
      } else {
        return false
      }
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return env.lookup_value (this.name) .unwrap_or_throw (
      new Error (
        `undefined name: ${this.name}`
      )
    )
  }
}

export
class exp_pi_t extends exp_t {
  name: string
  arg_type: exp_t
  ret_type: exp_t

  constructor (
    name: string,
    arg_type: exp_t,
    ret_type: exp_t,
  ) {
    super ()
    this.name = name
    this.arg_type = arg_type
    this.ret_type = ret_type
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_pi_t) {
      let sym = nanoid ()
      return this.arg_type.alpha_eq (
        that.arg_type,
        this_map,
        that_map,
      ) && this.ret_type.alpha_eq (
        that.ret_type,
        this_map.set (this.name, sym),
        that_map.set (this.name, sym),
      )
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_pi_t (
      this.arg_type.eval (env),
      new env_closure_t (
        env,
        this.name,
        this.ret_type,
      )
    )
  }
}

export
class exp_lambda_t extends exp_t {
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

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_lambda_t) {
      let sym = nanoid ()
      return this.body.alpha_eq (
        that.body,
        this_map.set (this.name, sym),
        that_map.set (this.name, sym),
      )
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_lambda_t (
      new env_closure_t (
        env,
        this.name,
        this.body,
      )
    )
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

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_apply_t) {
      return this.rator.alpha_eq (that.rator, this_map, that_map)
        && this.rand.alpha_eq (that.rand, this_map, that_map)
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return exp_apply_t.exe (
      this.rator.eval (env),
      this.rand.eval (env),
    )
  }

  static exe (
    fun: value_t,
    arg: value_t,
  ): value_t {
    if (fun instanceof value_lambda_t) {
      return fun.body.apply (arg)
    } else if (fun instanceof the_neutral_t &&
               fun.t instanceof value_pi_t) {
      return new the_neutral_t (
        fun.t.ret_type.apply (arg),
        new neutral_apply_t (
          fun.neutral,
          new the_value_t (fun.t.arg_type, arg),
        )
      )
    } else {
      throw new Error (`exe wrong type of value`)
    }
  }
}

export
class exp_sigma_t extends exp_t {
  name: string
  car_type: exp_t
  cdr_type: exp_t

  constructor (
    name: string,
    car_type: exp_t,
    cdr_type: exp_t,
  ) {
    super ()
    this.name = name
    this.car_type = car_type
    this.cdr_type = cdr_type
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_sigma_t) {
      let sym = nanoid ()
      return this.car_type.alpha_eq (
        that.car_type,
        this_map,
        that_map,
      ) && this.cdr_type.alpha_eq (
        that.cdr_type,
        this_map.set (this.name, sym),
        that_map.set (this.name, sym),
      )
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_sigma_t (
      this.car_type.eval (env),
      new env_closure_t (
        env,
        this.name,
        this.cdr_type,
      )
    )
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

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_cons_t) {
      return this.car.alpha_eq (that.car, this_map, that_map)
        && this.cdr.alpha_eq (that.cdr, this_map, that_map)
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_pair_t (
      this.car.eval (env),
      this.cdr.eval (env),
    )
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

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_car_t) {
      return this.pair.alpha_eq (that.pair, this_map, that_map)
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return exp_car_t.exe (
      this.pair.eval (env),
    )
  }

  static exe (
    pair: value_t,
  ): value_t {
    if (pair instanceof value_pair_t) {
      return pair.car
    } else if (pair instanceof the_neutral_t &&
               pair.t instanceof value_sigma_t) {
      return new the_neutral_t (
        pair.t.car_type,
        new neutral_car_t (pair.neutral),
      )
    } else {
      throw new Error (`exe wrong type of value`)
    }
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

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_cdr_t) {
      return this.pair.alpha_eq (that.pair, this_map, that_map)
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return exp_cdr_t.exe (
      this.pair.eval (env),
    )
  }

  static exe (
    pair: value_t,
  ): value_t {
    if (pair instanceof value_pair_t) {
      return pair.cdr
    } else if (pair instanceof the_neutral_t &&
               pair.t instanceof value_sigma_t) {
      return new the_neutral_t (
        pair.t.cdr_type.apply (
          exp_car_t.exe (pair)
        ),
        new neutral_cdr_t (pair.neutral),
      )
    } else {
      throw new Error (`exe wrong type of value`)
    }
  }
}

export
class exp_nat_t extends exp_t {
  constructor () {
    super ()
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_nat_t) {
      return true
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_nat_t ()
  }
}

export
class exp_zero_t extends exp_t {
  constructor () {
    super ()
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_zero_t) {
      return true
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_zero_t ()
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

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_add1_t) {
      return this.prev.alpha_eq (
        that.prev,
        this_map,
        that_map,
      )
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_add1_t (
      this.prev.eval (env)
    )
  }
}

export
class exp_ind_nat_t extends exp_t {
  target: exp_t
  motive: exp_t
  base: exp_t
  step: exp_t

  constructor (
    target: exp_t,
    motive: exp_t,
    base: exp_t,
    step: exp_t,
  ) {
    super ()
    this.target = target
    this.motive = motive
    this.base = base
    this.step = step
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_ind_nat_t) {
      return this.target.alpha_eq (that.target, this_map, that_map)
        && this.motive.alpha_eq (that.motive, this_map, that_map)
        && this.base.alpha_eq (that.base, this_map, that_map)
        && this.step.alpha_eq (that.step, this_map, that_map)
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return exp_ind_nat_t.exe (
      this.target.eval (env),
      this.motive.eval (env),
      this.base.eval (env),
      this.step.eval (env),
    )
  }

  static exe (
    target: value_t,
    motive: value_t,
    base: value_t,
    step: value_t,
  ): value_t {
    if (target instanceof value_zero_t) {
      return base
    } else if (target instanceof value_add1_t) {
      return exp_apply_t.exe (
        exp_apply_t.exe (step, target.prev),
        exp_ind_nat_t.exe (
          target.prev,
          motive,
          base,
          step,
        )
      )
    } else if (target instanceof the_neutral_t &&
               target.t instanceof value_nat_t) {
      return new the_neutral_t (
        exp_apply_t.exe (motive, target),
        new neutral_ind_nat_t (
          target.neutral,
          new the_value_t (
            new value_pi_t (
              new value_nat_t (),
              new native_closure_t ("k", k => {
                return new value_universe_t ()
              })
            ),
            motive,
          ),
          new the_value_t (
            exp_apply_t.exe (motive, new value_zero_t ()),
            base,
          ),
          new the_value_t (
            new value_pi_t (
              new value_nat_t (),
              new native_closure_t ("prev", prev => {
                return new value_pi_t (
                  exp_apply_t.exe (motive, prev),
                  new native_closure_t ("almost", almost => {
                    return exp_apply_t.exe (
                      motive, new value_add1_t (prev)
                    )
                  })
                )
              })
            ),
            step,
          )
        )
      )
    } else {
      throw new Error (`exe wrong type of value`)
    }
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

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_eqv_t) {
      return this.t.alpha_eq (that.t, this_map, that_map)
        && this.from.alpha_eq (that.from, this_map, that_map)
        && this.to.alpha_eq (that.to, this_map, that_map)
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_eqv_t (
      this.t.eval (env),
      this.from.eval (env),
      this.to.eval (env),
    )
  }
}

export
class exp_same_t extends exp_t {
  constructor () {
    super ()
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_same_t) {
      return true
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_same_t ()
  }
}

export
class exp_replace_t extends exp_t {
  target: exp_t
  motive: exp_t
  base: exp_t

  constructor (
    target: exp_t,
    motive: exp_t,
    base: exp_t,
  ) {
    super ()
    this.target = target
    this.motive = motive
    this.base = base
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_replace_t) {
      return true
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return exp_replace_t.exe (
      this.target.eval (env),
      this.motive.eval (env),
      this.base.eval (env),
    )
  }

  static exe (
    target: value_t,
    motive: value_t,
    base: value_t,
  ): value_t {
    if (target instanceof value_same_t) {
      return base
    } else if (target instanceof the_neutral_t &&
               target.t instanceof value_eqv_t) {
      return new the_neutral_t (
        exp_apply_t.exe (motive, target.t.to),
        new neutral_replace_t (
          target.neutral,
          new the_value_t (
            new value_pi_t (
              target.t.t,
              new native_closure_t ("x", _value => {
                return new value_universe_t ()
              })
            ),
            motive,
          ),
          new the_value_t (
            exp_apply_t.exe (motive, target.t.from),
            base,
          )
        )
      )
    } else {
      throw new Error (`exe wrong type of value`)
    }
  }
}

export
class exp_trivial_t extends exp_t {
  constructor () {
    super ()
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_trivial_t) {
      return true
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_trivial_t ()
  }
}

export
class exp_sole_t extends exp_t {
  constructor () {
    super ()
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_sole_t) {
      return true
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_sole_t ()
  }
}

export
class exp_absurd_t extends exp_t {
  constructor () {
    super ()
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_absurd_t) {
      return true
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_absurd_t ()
  }
}

export
class exp_ind_absurd_t extends exp_t {
  target: exp_t
  motive: exp_t

  constructor (
    target: exp_t,
    motive: exp_t,
  ) {
    super ()
    this.target = target
    this.motive = motive
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_ind_absurd_t) {
      return this.target.alpha_eq (that.target, this_map, that_map)
        && this.motive.alpha_eq (that.motive, this_map, that_map)
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return exp_ind_absurd_t.exe (
      this.target.eval (env),
      this.motive.eval (env),
    )
  }

  static exe (
    target: value_t,
    motive: value_t,
  ): value_t {
    if (target instanceof the_neutral_t &&
        target.t instanceof value_absurd_t) {
      return new the_neutral_t (
        motive,
        new neutral_ind_absurd_t (
          target.neutral,
          new the_value_t (
            new value_universe_t (),
            motive,
          )
        )
      )
    } else {
      throw new Error (`exe wrong type of value`)
    }
  }
}

export
class exp_atom_t extends exp_t {
  constructor () {
    super ()
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_atom_t) {
      return true
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_atom_t ()
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

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_quote_t) {
      return this.sym === that.sym
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_quote_t (this.sym)
  }
}

export
class exp_universe_t extends exp_t {
  constructor () {
    super ()
  }

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_universe_t) {
      return true
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_universe_t ()
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

  alpha_eq (
    that: exp_t,
    this_map: Map <string, string>,
    that_map: Map <string, string>,
  ): boolean {
    if (that instanceof exp_the_t) {
      if (this.t.alpha_eq (that.t, this_map, that_map) &&
          this.value.alpha_eq (that.value, this_map, that_map)) {
        return true
      } else if (this.t instanceof exp_absurd_t &&
                 that.t instanceof exp_absurd_t) {
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return this.value.eval (env)
  }
}

export
abstract class value_t {
  value_t: "value_t" = "value_t"

  abstract read_back_normal (ctx: ctx_t, t: value_t): exp_t
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

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    let fresh_name = freshen (
      ctx.names (),
      this.ret_type.name,
    )
    return new exp_sigma_t (
      fresh_name,
      this.arg_type.read_back_normal (
        ctx, new value_universe_t (),
      ),
      this.ret_type.apply (
        new the_neutral_t (
          this.arg_type, new neutral_var_t (fresh_name),
        )
      ) .read_back_normal (
        ctx.ext (fresh_name, new bind_t (this.arg_type)),
        new value_universe_t (),
      )
    )
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

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    if (t instanceof value_pi_t) {
      let fresh_name = freshen (
        ctx.names (),
        t.ret_type.name,
      )
      let arg = new the_neutral_t (
        t.arg_type,
        new neutral_var_t (fresh_name),
      )
      return new exp_lambda_t (
        fresh_name,
        exp_apply_t.exe (this, arg) .read_back_normal (
          ctx.ext (fresh_name, new bind_t (t.arg_type)),
          t.ret_type.apply (arg),
        )
      )
    } else {
      throw new Error (
        `type of lambda must be pi`
      )
    }
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

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    let fresh_name = freshen (
      ctx.names (),
      this.cdr_type.name,
    )
    return new exp_sigma_t (
      fresh_name,
      this.car_type.read_back_normal (
        ctx, new value_universe_t (),
      ),
      this.cdr_type.apply (
        new the_neutral_t (
          this.car_type, new neutral_var_t (fresh_name),
        )
      ) .read_back_normal (
        ctx.ext (fresh_name, new bind_t (this.car_type)),
        new value_universe_t (),
      )
    )
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

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    if (t instanceof value_sigma_t) {
      let car = exp_car_t.exe (this)
      // QUESTION
      // in "nbe" author uses `the_value_t` as `value_t` here
      // uses `the_car` instead of `car`
      let cdr = exp_cdr_t.exe (this)
      return new exp_cons_t (
        car.read_back_normal (ctx, t.car_type),
        cdr.read_back_normal (ctx, t.cdr_type.apply (car)),
      )
    } else {
      throw new Error (
        `type of pair must be sigma`
      )
    }
  }
}

export
class value_nat_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_nat_t ()
  }
}

export
class value_zero_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_zero_t ()
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

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_add1_t (
      this.prev.read_back_normal (ctx, t)
    )
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

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_eqv_t (
      this.t.read_back_normal (ctx, new value_universe_t ()),
      this.from.read_back_normal (ctx, this.t),
      this.to.read_back_normal (ctx, this.t),
    )
  }
}

export
class value_same_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_same_t ()
  }
}

export
class value_trivial_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_trivial_t ()
  }
}

export
class value_sole_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_sole_t ()
  }
}

export
class value_absurd_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_absurd_t ()
  }
}

export
class value_atom_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_atom_t ()
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

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_quote_t (this.sym)
  }
}

export
class value_universe_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    return new exp_universe_t ()
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

  read_back_normal (ctx: ctx_t, t: value_t): exp_t {
    if (t instanceof value_absurd_t) {
      return new exp_the_t (
        new exp_absurd_t (),
        this.neutral.read_back_neutral (ctx),
      )
    } else {
      return this.neutral.read_back_neutral (ctx)
    }
  }
}

export
abstract class neutral_t {
  neutral_t: "neutral_t" = "neutral_t"

  abstract read_back_neutral (ctx: ctx_t): exp_t
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

  read_back_neutral (ctx: ctx_t): exp_t {
    return ut.TODO ()
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

  read_back_neutral (ctx: ctx_t): exp_t {
    return ut.TODO ()
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

  read_back_neutral (ctx: ctx_t): exp_t {
    return ut.TODO ()
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

  read_back_neutral (ctx: ctx_t): exp_t {
    return ut.TODO ()
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

  read_back_neutral (ctx: ctx_t): exp_t {
    return ut.TODO ()
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

  read_back_neutral (ctx: ctx_t): exp_t {
    return ut.TODO ()
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

  read_back_neutral (ctx: ctx_t): exp_t {
    return ut.TODO ()
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
