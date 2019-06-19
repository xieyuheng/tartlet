import assert from "assert"
import nanoid from "nanoid"
import * as ut from "cicada-lang/lib/util"
import { result_t, ok_t, err_t } from "cicada-lang/lib/result"
import { option_t, some_t, none_t } from "cicada-lang/lib/option"

export
class error_message_t {
  message: string

  constructor (message: string) {
    this.message = message
  }
}

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

  lookup (name: string): option_t <den_t> {
    let den = this.map.get (name)
    if (den !== undefined) {
      return new some_t (den)
    } else {
      return new none_t ()
    }
  }

  lookup_type (name: string): option_t <value_t> {
    let den = this.map.get (name)
    if (den instanceof def_t ||
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
          new neutral_var_t (name)))
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
        .set (name, den))
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
            new neutral_var_t (name)))
      } else {
        throw new Error (
          `unknow type of den_t ${den.constructor.name}`)
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
        .set (name, value))
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
      this.env.ext (this.name, value))
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

  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    let msg = new error_message_t (
      `infer is not implemented for exp type: ${this.constructor.name}`)
    return new err_t (msg)
  }

  /*
    ctx :- exp => E
    ctx :- conversion_check (UNIVERSE, T, E)
    -----------------
    ctx :- exp <= T
  */
  check (
    ctx: ctx_t,
    t: value_t,
  ): result_t <exp_t, error_message_t> {
    return this.infer (ctx)
      .bind (the => {
        return conversion_check (
          ctx, new value_universe_t (),
          t, the.t.eval (ctx.to_env ()))
          .bind (_ok => new ok_t (the.value))
      })
  }
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
        `undefined name: ${this.name}`))
  }

  /*
    -----------------
    ctx :- VAR (name) => ctx.lookup_type (name)
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return ctx.lookup_type (this.name) .match ({
      some: t => new ok_t (
        new exp_the_t (
          t.read_back (ctx, new value_universe_t ()),
          this)),
      none: () => new err_t (
        new error_message_t (
          `can not find name: ${this.name} in ctx`)),
    })
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
        that_map.set (this.name, sym))
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
        this.ret_type))
  }

  /*
    ctx :- A <= UNIVERSE
    ctx.ext (x, A) :- B <= UNIVERSE
    -----------------
    ctx :- PI (x: A, R) => UNIVERSE
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return this.arg_type
      .check (ctx, new value_universe_t ())
      .bind (arg_type => {
        return this.ret_type
          .check (
            ctx.ext (
              this.name,
              new bind_t (arg_type.eval (ctx.to_env ()))),
            new value_universe_t ())
          .bind (ret_type => {
            return new ok_t (
              new exp_the_t (
                new exp_universe_t (),
                new exp_pi_t (
                  this.name,
                  arg_type,
                  ret_type)))
          })
      })
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
        that_map.set (this.name, sym))
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_lambda_t (
      new env_closure_t (
        env,
        this.name,
        this.body))
  }

  /*
    ctx.ext (x, A) :- body <= R
    ------------------------------
    ctx :- LAMBDA (x, body) <= PI (x: A, R)
  */
  check (
    ctx: ctx_t,
    t: value_t,
  ): result_t <exp_t, error_message_t> {
    if (t instanceof value_pi_t) {
      let pi = t
      let var_value = new the_neutral_t (
        pi.arg_type,
        new neutral_var_t (this.name))
      return this.body
        .check (
          ctx.ext (this.name, new bind_t (pi.arg_type)),
          pi.ret_type.apply (var_value))
        .bind (body => {
          return new ok_t (new exp_lambda_t (this.name, body))
        })
    } else {
      return new err_t (
        new error_message_t (
          "expected value_pi_t"))
    }
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
      this.rand.eval (env))
  }

  static exe (
    fun: value_t,
    arg: value_t,
  ): value_t {
    if (fun instanceof value_lambda_t) {
      return fun.closure.apply (arg)
    } else if (fun instanceof the_neutral_t &&
               fun.t instanceof value_pi_t) {
      return new the_neutral_t (
        fun.t.ret_type.apply (arg),
        new neutral_apply_t (
          fun.neutral,
          new the_value_t (fun.t.arg_type, arg)))
    } else {
      throw new Error (`exe wrong type of value`)
    }
  }

  /*
    ctx :- rator => PI (x: A, R)
    ctx :- rand <= A
    -----------------
    ctx :- APPLY (rator, rand) => R
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return this.rator
      .infer (ctx)
      .bind (the => {
        let t = the.t.eval (ctx.to_env ())
        if (t instanceof value_pi_t) {
          // typescript's type checker will fail
          //   when just use `(pi instanceof value_pi_t)`
          let pi = t as value_pi_t
          return this.rand
            .check (ctx, pi.arg_type)
            .bind (rand => {
              return new ok_t (
                new exp_the_t (
                  pi.ret_type.apply (rand.eval (ctx.to_env ()))
                    .read_back (ctx, new value_universe_t ()),
                  new exp_apply_t (the.value, rand)))
            })
        } else {
          console.log ("t:", t)
          return new err_t (
            new error_message_t (
              "expected value_pi_t"))
        }
      })
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
        that_map.set (this.name, sym))
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

  /*
    ctx :- A <= UNIVERSE
    ctx.ext (x, A) :- D <= UNIVERSE
    -----------------
    ctx :- SIGMA (x: A, D) => UNIVERSE
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return this.car_type
      .check (ctx, new value_universe_t ())
      .bind (car_type => {
        return this.cdr_type
          .check (
            ctx.ext (
              this.name,
              new bind_t (car_type.eval (ctx.to_env ()))),
            new value_universe_t ())
          .bind (cdr_type => {
            return new ok_t (
              new exp_the_t (
                new exp_universe_t (),
                new exp_sigma_t (
                  this.name,
                  car_type,
                  cdr_type)))
          })
      })
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
      this.cdr.eval (env))
  }

  /*
    ctx :- car <= A
    ctx.ext (x, A) :- cdr <= D
    -----------------
    ctx :- CONS (car, cdr) <= SIGMA (x: A, D)
  */
  check (
    ctx: ctx_t,
    t: value_t,
  ): result_t <exp_t, error_message_t> {
    if (t instanceof value_sigma_t) {
      return this.car
        .check (ctx, t.car_type)
        .bind (car => {
          let cdr_type_value =
            t.cdr_type.apply (car.eval (ctx.to_env ()))
          return this.cdr
            .check (ctx, cdr_type_value)
            .bind (cdr => {
              return new ok_t (new exp_cons_t (car, cdr))
            })
        })
    } else {
      return new err_t (
        new error_message_t (
          "expected value_sigma_t"))
    }
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
        new neutral_car_t (pair.neutral))
    } else {
      throw new Error (`exe wrong type of value`)
    }
  }

  /*
    ctx: p => SIGMA (x: A, D)
    ----------------
    ctx :- CAR (p) => A
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return this.pair
      .infer (ctx)
      .bind (the => {
        if (the instanceof exp_the_t &&
            the.t instanceof exp_sigma_t) {
          let sigma = the.t.eval (ctx.to_env ())
          if (sigma instanceof value_sigma_t) {
            return new ok_t (
              new exp_the_t (
                sigma.car_type.read_back (
                  ctx, new value_universe_t ()),
                new exp_car_t (the.value)))
          } else {
            let msg = new error_message_t ("no sigma value")
            return new err_t (msg)
          }
        } else {
          let msg = new error_message_t ("no sigma exp")
          return new err_t (msg)
        }
      })
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
      this.pair.eval (env))
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
          exp_car_t.exe (pair)),
        new neutral_cdr_t (pair.neutral))
    } else {
      throw new Error (`exe wrong type of value`)
    }
  }

  /*
    ctx: p => SIGMA (x: A, D)
    ----------------
    ctx :- CDR (p) => D .subst (x, CAR (p))
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return this.pair
      .infer (ctx)
      .bind (the => {
        if (the instanceof exp_the_t &&
            the.t instanceof exp_sigma_t) {
          let sigma = the.t.eval (ctx.to_env ())
          if (sigma instanceof value_sigma_t) {
            let pair = the.value.eval (ctx.to_env ())
            let car = exp_car_t.exe (pair)
            return new ok_t (
              new exp_the_t (
                sigma.cdr_type.apply (car) .read_back (
                  ctx, new value_universe_t ()),
                new exp_car_t (the.value)))
          } else {
            let msg = new error_message_t ("no sigma value")
            return new err_t (msg)
          }
        } else {
          let msg = new error_message_t ("no sigma exp")
          return new err_t (msg)
        }
      })
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

  /*
    -----------------
    ctx :- NAT => UNIVERSE
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return new ok_t (
      new exp_the_t (
        new exp_universe_t (),
        new exp_nat_t ()))
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

  /*
    ---------------------
    ctx :- ZERO <= NAT
  */
  check (
    ctx: ctx_t,
    t: value_t,
  ): result_t <exp_t, error_message_t> {
    if (t instanceof value_nat_t) {
      return new ok_t (this)
    } else {
      return new err_t (
        new error_message_t (
          "expected value_nat_t"))
    }
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
      return this.prev.alpha_eq (that.prev, this_map, that_map)
    } else {
      return false
    }
  }

  eval (env: env_t): value_t {
    return new value_add1_t (this.prev.eval (env))
  }

  /*
    ctx :- prev <= NAT
    ---------------------
    ctx :- ADD1 (prev) <= NAT
  */
  check (
    ctx: ctx_t,
    t: value_t,
  ): result_t <exp_t, error_message_t> {
    if (t instanceof value_nat_t) {
      return this.prev
        .check (ctx, new value_nat_t ())
        .bind (prev => {
          return new ok_t (prev)
        })
    } else {
      return new err_t (
        new error_message_t (
          "expected value_nat_t"))
    }
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
      this.step.eval (env))
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
          step))
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
              })),
            motive),
          new the_value_t (
            exp_apply_t.exe (motive, new value_zero_t ()),
            base),
          new the_value_t (
            new value_pi_t (
              new value_nat_t (),
              new native_closure_t ("prev", prev => {
                return new value_pi_t (
                  exp_apply_t.exe (motive, prev),
                  new native_closure_t ("almost", almost => {
                    return exp_apply_t.exe (
                      motive, new value_add1_t (prev))
                  }))
              })),
            step)))
    } else {
      throw new Error (`exe wrong type of value`)
    }
  }

  /*
    ctx :- target <= NAT
    ctx :- motive <= PI (_: NAT, UNIVERSE)
    ctx :- base <= motive (ZERO)
    ctx :- step <= PI (
    --          prev: NAT, PI (
    --            almost: motive (prev), motive (ADD1 (prev))))
    --------------------
    ctx :- IND_NAT (target, motive, base, step) => motive (target)
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return this.target
      .check (ctx, new value_universe_t ())
      .bind (target => {
        return this.motive
          .check (ctx, new value_pi_t (
            new value_nat_t (),
            new native_closure_t (
              "n", _ => new value_universe_t ())))
          .bind (motive => {
            let motive_value = motive.eval (ctx.to_env ())
            let target_value = target.eval (ctx.to_env ())
            return this.base
              .check (ctx, exp_apply_t.exe (
                motive_value, new value_zero_t ()))
              .bind (base => {
                return this.step
                  .check (ctx, ind_nat_step_type (motive_value))
                  .bind (step => {
                    return new ok_t (
                      new exp_the_t (
                        exp_apply_t
                          .exe (
                            motive_value, target_value)
                          .read_back (
                            ctx, new value_universe_t ()),
                        new exp_ind_nat_t (
                          target, motive, base, step)))
                  })
              })
          })
      })
  }
}

function ind_nat_step_type (motive: value_t): value_pi_t {
  return new value_pi_t (
    new value_nat_t (),
    new native_closure_t ("prev", prev => {
      return new value_pi_t (
        exp_apply_t.exe (motive, prev),
        new native_closure_t ("almost", almost => {
          return exp_apply_t.exe (motive, new value_add1_t (prev))
        }))
    }))
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
      this.to.eval (env))
  }

  /*
    ctx :- T <= UNIVERSE
    ctx :- from <= T
    ctx :- to <= T
    --------------------
    ctx :- EQV (T, from, to) => UNIVERSE
   */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return this.t
      .check (ctx, new value_universe_t ())
      .bind (t => {
        let t_value = t.eval (ctx.to_env ())
        return this.from
          .check (ctx, t_value)
          .bind (from => {
            return this.to
              .check (ctx, t_value)
              .bind (to => {
                return new ok_t (
                  new exp_the_t (
                    new exp_universe_t,
                    new exp_eqv_t (t, from, to)))
              })
          })
      })
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

  /*
    ctx :- conversion_check (T, from, to)
    ---------------------
    ctx :- SAME <= EQV (T, from, to)
  */
  check (
    ctx: ctx_t,
    t: value_t,
  ): result_t <exp_t, error_message_t> {
    if (t instanceof value_eqv_t) {
      let eqv = t
      return conversion_check (ctx, eqv.t, eqv.from, eqv.to)
        .bind (_ok => {
          return new ok_t (this)
        })
    } else {
      return new err_t (
        new error_message_t (
          "expected value_eqv_t"))
    }
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
      this.base.eval (env))
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
              })),
            motive),
          new the_value_t (
            exp_apply_t.exe (motive, target.t.from),
            base)))
    } else {
      throw new Error (`exe wrong type of value`)
    }
  }

  /*
    ctx :- target => EQV (T, from, to)
    ctx :- motive <= PI (_: T, UNIVERSE)
    ctx :- base <= motive (from)
    --------------------
    ctx :- REPLACE (target, motive, base) => motive (to)
   */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return this.target
      .infer (ctx)
      .bind (the => {
        let t = the.t.eval (ctx.to_env ())
        if (t instanceof value_eqv_t) {
          // typescript's type checker will fail
          //   when just use `(eqv instanceof value_eqv_t)`
          let eqv = t as value_eqv_t
          return this.motive
            .check (ctx, new value_pi_t (
              eqv.t, new native_closure_t (
                "x", _ => new value_universe_t ())))
            .bind (motive => {
              let motive_value = motive.eval (ctx.to_env ())
              return this.base
                .check (ctx, exp_apply_t.exe (
                  motive_value, eqv.from))
                .bind (base => {
                  return new ok_t (
                    new exp_the_t (
                      exp_apply_t
                        .exe (motive_value, eqv.to)
                        .read_back (ctx, new value_universe_t ()),
                      new exp_replace_t (
                        the.value,
                        motive,
                        base)))
                })
            })
        } else {
          return new err_t (
            new error_message_t (
              "expected value_eqv_t"))
        }
      })
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

  /*
    -----------------
    ctx :- TRIVIAL => UNIVERSE
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return new ok_t (
      new exp_the_t (
        new exp_universe_t (),
        new exp_trivial_t ()))
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

  /*
    ---------------------
    ctx :- SOLE <= TRIVIAL
  */
  check (
    ctx: ctx_t,
    t: value_t,
  ): result_t <exp_t, error_message_t> {
    if (t instanceof value_trivial_t) {
      return new ok_t (this)
    } else {
      return new err_t (
        new error_message_t (
          "expected value_trivial_t"))
    }
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

  /*
    -----------------
    ctx :- ABSURD => UNIVERSE
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return new ok_t (
      new exp_the_t (
        new exp_universe_t (),
        new exp_absurd_t ()))
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
            motive)))
    } else {
      throw new Error (`exe wrong type of value`)
    }
  }

  /*
    ctx :- target <= ABSURD
    ctx :- motive <= UNIVERSE
    -----------------
    ctx :- IND_ABSURD (target, motive) => UNIVERSE
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return this.target
      .check (ctx, new value_absurd_t ())
      .bind (target => {
        return this.motive
          .check (ctx, new value_universe_t ())
          .bind (motive => {
            return new ok_t (
              new exp_the_t (
                new exp_universe_t (),
                new exp_ind_absurd_t (
                  target,
                  motive)))
          })
      })
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

  /*
    -----------------
    ctx :- ATOM => UNIVERSE
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return new ok_t (
      new exp_the_t (
        new exp_universe_t (),
        new exp_atom_t ()))
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

  /*
    ---------------------
    ctx :- QUOTE (sym) <= ATOM
  */
  check (
    ctx: ctx_t,
    t: value_t,
  ): result_t <exp_t, error_message_t> {
    if (t instanceof value_atom_t) {
      return new ok_t (this)
    } else {
      return new err_t (
        new error_message_t (
          "expected value_atom_t"))
    }
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

  /*
    -----------------
    ctx :- UNIVERSE => UNIVERSE
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return new ok_t (
      new exp_the_t (
        new exp_universe_t (),
        new exp_universe_t ()))
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

  /*
    ctx :- T <= UNIVERSE
    ctx :- e <= T
    -----------------
    ctx :- e: T => T
  */
  infer (ctx: ctx_t): result_t <exp_the_t, error_message_t> {
    return this.t
      .check (ctx, new value_universe_t ())
      .bind (t => {
        return this.value
          .check (ctx, t.eval (ctx.to_env ()))
          .bind (value => {
            return new ok_t (
              new exp_the_t (t, value))
          })
      })
  }
}

export
abstract class value_t {
  value_t: "value_t" = "value_t"

  abstract read_back (ctx: ctx_t, t: value_t): exp_t
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

  read_back (ctx: ctx_t, t: value_t): exp_t {
    let fresh_name = freshen (
      ctx.names (),
      this.ret_type.name)
    return new exp_pi_t (
      fresh_name,
      this.arg_type.read_back (
        ctx, new value_universe_t ()),
      this.ret_type.apply (
        new the_neutral_t (
          this.arg_type,
          new neutral_var_t (fresh_name)))
        .read_back (
          ctx.ext (fresh_name, new bind_t (this.arg_type)),
          new value_universe_t ()))
  }
}

export
class value_lambda_t extends value_t {
  closure: closure_t

  constructor (
    closure: closure_t,
  ) {
    super ()
    this.closure = closure
  }

  read_back (ctx: ctx_t, t: value_t): exp_t {
    if (t instanceof value_pi_t) {
      let fresh_name = freshen (
        ctx.names (),
        t.ret_type.name)
      let arg = new the_neutral_t (
        t.arg_type,
        new neutral_var_t (fresh_name))
      return new exp_lambda_t (
        fresh_name,
        exp_apply_t.exe (this, arg) .read_back (
          ctx.ext (fresh_name, new bind_t (t.arg_type)),
          t.ret_type.apply (arg)))
    } else {
      throw new Error (`type of lambda must be pi`)
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

  read_back (ctx: ctx_t, t: value_t): exp_t {
    let fresh_name = freshen (
      ctx.names (),
      this.cdr_type.name)
    return new exp_sigma_t (
      fresh_name,
      this.car_type.read_back (
        ctx, new value_universe_t ()),
      this.cdr_type.apply (
        new the_neutral_t (
          this.car_type, new neutral_var_t (fresh_name)))
        .read_back (
          ctx.ext (fresh_name, new bind_t (this.car_type)),
          new value_universe_t ()))
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

  read_back (ctx: ctx_t, t: value_t): exp_t {
    if (t instanceof value_sigma_t) {
      let car = exp_car_t.exe (this)
      // QUESTION
      // in "nbe" author uses `the_value_t` as `value_t` here
      // uses `the_car` instead of `car`
      let cdr = exp_cdr_t.exe (this)
      return new exp_cons_t (
        car.read_back (ctx, t.car_type),
        cdr.read_back (ctx, t.cdr_type.apply (car)))
    } else {
      throw new Error (`type of pair must be sigma`)
    }
  }
}

export
class value_nat_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back (ctx: ctx_t, t: value_t): exp_t {
    return new exp_nat_t ()
  }
}

export
class value_zero_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back (ctx: ctx_t, t: value_t): exp_t {
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

  read_back (ctx: ctx_t, t: value_t): exp_t {
    return new exp_add1_t (this.prev.read_back (ctx, t))
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

  read_back (ctx: ctx_t, t: value_t): exp_t {
    return new exp_eqv_t (
      this.t.read_back (ctx, new value_universe_t ()),
      this.from.read_back (ctx, this.t),
      this.to.read_back (ctx, this.t))
  }
}

export
class value_same_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back (ctx: ctx_t, t: value_t): exp_t {
    return new exp_same_t ()
  }
}

export
class value_trivial_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back (ctx: ctx_t, t: value_t): exp_t {
    return new exp_trivial_t ()
  }
}

export
class value_sole_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back (ctx: ctx_t, t: value_t): exp_t {
    return new exp_sole_t ()
  }
}

export
class value_absurd_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back (ctx: ctx_t, t: value_t): exp_t {
    return new exp_absurd_t ()
  }
}

export
class value_atom_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back (ctx: ctx_t, t: value_t): exp_t {
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

  read_back (ctx: ctx_t, t: value_t): exp_t {
    return new exp_quote_t (this.sym)
  }
}

export
class value_universe_t extends value_t {
  constructor (
  ) {
    super ()
  }

  read_back (ctx: ctx_t, t: value_t): exp_t {
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

  read_back (ctx: ctx_t, t: value_t): exp_t {
    if (t instanceof value_absurd_t) {
      return new exp_the_t (
        new exp_absurd_t (),
        this.neutral.read_back_neutral (ctx))
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
    return new exp_var_t (this.name)
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
    return new exp_apply_t (
      this.fun.read_back_neutral (ctx),
      this.arg.read_back_the_value (ctx))
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
    return new exp_car_t (this.pair.read_back_neutral (ctx))
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
    return new exp_cdr_t (this.pair.read_back_neutral (ctx))
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
    return new exp_ind_nat_t (
      this.target.read_back_neutral (ctx),
      this.motive.read_back_the_value (ctx),
      this.base.read_back_the_value (ctx),
      this.step.read_back_the_value (ctx))
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
    return new exp_replace_t (
      this.target.read_back_neutral (ctx),
      this.motive.read_back_the_value (ctx),
      this.base.read_back_the_value (ctx))
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
    return new exp_ind_absurd_t (
      new exp_the_t (
        new exp_absurd_t (),
        this.target.read_back_neutral (ctx)),
      this.motive.read_back_the_value (ctx))
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

  read_back_the_value (ctx: ctx_t): exp_t {
    return this.value.read_back (ctx, this.t)
  }
}

export
function alpha_eq (
  e1: exp_t,
  e2: exp_t,
): boolean {
  return e1.alpha_eq (e2, new Map (), new Map ())
}

export
function conversion_check (
  ctx: ctx_t,
  t: value_t,
  v1: value_t,
  v2: value_t,
): result_t <"ok", error_message_t> {
  let e1 = v1.read_back (ctx, t)
  let e2 = v2.read_back (ctx, t)
  if (alpha_eq (e2, e1)) {
    return new ok_t ("ok")
  } else {
    return new err_t (
      new error_message_t ("conversion_check fail"))
  }
}

export
class module_t {
  ctx: ctx_t

  constructor (
    ctx: ctx_t = new ctx_t (),
  ) {
    this.ctx = ctx
  }

  get used_names (): Set <string> {
    return new Set (this.ctx.map.keys ())
  }

  copy (): module_t {
    return new module_t (this.ctx.copy ())
  }

  /** `use` means "import all from" */
  use (other: module_t): this {
    for (let [name, den] of other.ctx.map.entries ()) {
      this.ctx.lookup (name) .match ({
        some: _value => {
          throw new Error (`name alreay defined: ${name}`)
        },
        none: () => {
          this.ctx.map.set (name, den)
        },
      })
    }
    return this
  }

  claim (name: string, t: exp_t): this {
    this.ctx.lookup_type (name) .none_or_throw (
      new Error (`name: ${name} is alreay claimed`))

    t.check (this.ctx, new value_universe_t ()) .match ({
      ok: checked_type => {
        this.ctx = this.ctx.ext (name, new bind_t (
          checked_type.eval (this.ctx.to_env ())))
      },
      err: error => {
        throw new Error (
          `type check fail, name: ${name}`)
      },
    })
    return this
  }

  define (name: string, exp: exp_t): this {
    let den = this.ctx.lookup (name) .unwrap_or_throw (
      new Error (`name: ${name} is not claimed before define`))
    if (den instanceof bind_t) {
      let t = den.t
      exp.check (this.ctx, t) .match ({
        ok: _value => {},
        err: error => {
          new Error (`type check fail for name: ${name}, error: ${error}`)
        }
      })
      this.ctx = this.ctx.ext (
        name, new def_t (t, exp.eval (this.ctx.to_env ())))
    } else if (den instanceof def_t) {
      throw new Error (
        `name: ${name} is alreay defined`)
    } else {
      throw new Error (
        `unknown sub class of den_t: ${this.constructor.name}`)
    }
    return this
  }

  run (exp: exp_t): result_t <exp_t, error_message_t> {
    return exp.infer (this.ctx)
      .bind (the => {
        return new ok_t (new exp_the_t (
          the.t,
          the.value
            .eval (this.ctx.to_env ())
            .read_back (
              this.ctx,
              the.t.eval (this.ctx.to_env ()))))
      })
  }
}
