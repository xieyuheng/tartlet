import assert from "assert"
import * as ut from "cicada-lang/lib/util"
import { result_t, ok_t, err_t } from "cicada-lang/lib/result"
import { option_t, some_t, none_t } from "cicada-lang/lib/option"

export
abstract class value_t {
  value_tag: "value_t" = "value_t"
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

/**
 * The typing context.
 */
export
class ctx_t {
  map: Map <string, type_t>

  constructor (
    map: Map <string, type_t> = new Map ()
  ) {
    this.map = map
  }

  find (name: string): option_t <type_t> {
    let value = this.map.get (name)
    if (value !== undefined) {
      return new some_t (value)
    } else {
      return new none_t ()
    }
  }

  copy (): ctx_t {
    return new ctx_t (new Map (this.map))
  }

  ext (name: string, t: type_t): ctx_t {
    return new ctx_t (
      new Map (this.map)
        .set (name, t)
    )
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

  static exe (fun: value_t, arg: value_t): value_t {
    if (fun instanceof closure_t) {
      return fun.body.eval (
        fun.env.ext (fun.name, arg)
      )
    } else if (fun instanceof the_neutral_t) {
      if (fun.t instanceof arrow_t) {
        return new the_neutral_t (
          fun.t.ret,
          new neutral_apply_t (
            fun.neutral,
            new the_value_t (fun.t.arg, arg)
          )
        )
      } else {
        throw new Error (
          `type of the neutral fun is not arrow_t`
        )
      }
    } else {
      throw new Error (
        `unknown fun value: ${fun}`
      )
    }
  }
}

export
class zero_value_t extends value_t {
  constructor () {
    super ()
  }
}

export
class add1_value_t extends value_t {
  prev: value_t

  constructor (
    prev: value_t,
  ) {
    super ()
    this.prev = prev
  }
}

export
class the_value_t extends value_t {
  t: type_t
  value: value_t

  constructor (
    t: type_t,
    value: value_t,
  ) {
    super ()
    this.t = t
    this.value = value
  }
}

export
class the_neutral_t extends value_t {
  t: type_t
  neutral: neutral_t

  constructor (
    t: type_t,
    neutral: neutral_t,
  ) {
    super ()
    this.t = t
    this.neutral = neutral
  }
}

export
abstract class exp_t {
  exp_tag: "exp_t" = "exp_t"

  abstract eq (that: exp_t): boolean
  abstract eval (env: env_t): value_t

  synth (ctx: ctx_t): result_t <type_t, string> {
    return new err_t (
      `synth is not implemented for type: ${this.constructor.name}`
    )
  }

  /*
    ctx :- e => B
    B == A
    -----------------
    ctx :- e <= A
  */
  check (t: type_t, ctx: ctx_t = new ctx_t ()): result_t <"ok", string> {
    return this.synth (ctx) .bind (t2 => {
      if (t2.eq (t)) {
        return result_t.pure ("ok")
      } else {
        return new err_t (
          `check is not implemented for type: ${this.constructor.name}`
        )
      }
    })
  }
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

  eval (env: env_t = new env_t ()): closure_t {
    return new closure_t (env, this.name, this.body)
  }

  /*
    ctx.ext (x, A) :- e <= B
    -------------------------
    ctx :- lambda (x) { e } <= A -> B
  */

  check (t: type_t, ctx: ctx_t = new ctx_t ()): result_t <"ok", string> {
    if (t instanceof arrow_t) {
      let arrow = t
      return this.body.check (
        arrow.ret,
        ctx.ext (this.name, arrow.arg),
      )
    } else {
      return new err_t (
        `type of lambda is not arrow_t, bound name: ${this.name}`
      )
    }
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

  eval (env: env_t = new env_t ()): value_t {
    return env.find (this.name) .unwrap_or_throw (
      new Error (
        `undefined name: ${this.name}`
      )
    )
  }

  /*
    --------------------------
    ctx.find (x, A) :- x => A
  */

  synth (ctx: ctx_t): result_t <type_t, string> {
    return ctx.find (this.name) .match ({
      some: t => result_t.pure (t),
      none: () => new err_t (
        "can not find var in ctx"
      ),
    })
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

  eval (env: env_t = new env_t ()): value_t {
    return closure_t.exe (
      this.rator.eval (env),
      this.rand.eval (env))
  }

  /*
    ctx :- e1 => A -> B
    ctx :- e2 <= A
    ---------------
    ctx :- (e1 e2) => B
  */

  synth (ctx: ctx_t): result_t <type_t, string> {
    return this.rator.synth (ctx)
      .bind (rator_type => {
        if (rator_type instanceof arrow_t) {
          return this.rand.check (rator_type.arg, ctx)
            .bind (_ => {
              return result_t.pure (rator_type.ret)
            })
        } else {
          return new err_t (
            "rator type is not arrow_t"
          )
        }
      })
  }
}

export
class module_t {
  env: env_t
  ctx: ctx_t

  constructor (
    env: env_t = new env_t (),
    ctx: ctx_t = new ctx_t (),
  ) {
    this.env = env
    this.ctx = ctx
  }

  get used_names (): Set <string> {
    return new Set (this.ctx.map.keys ())
  }

  copy (): module_t {
    return new module_t (this.env.copy ())
  }

  /** `use` means "import all from" */
  use (other: module_t): this {
    for (let [name, value] of other.env.map.entries ()) {
      this.env.find (name) .match ({
        some: _value => {
          throw new Error (`name alreay defined: ${name}`)
        },
        none: () => {
          this.env.map.set (name, value)
        },
      })
    }
    return this
  }

  claim (name: string, t: type_t): this {
    this.ctx = this.ctx.ext (name, t)
    return this
  }

  define (name: string, exp: exp_t): this {
    let t = this.ctx.find (name) .unwrap_or_throw (
      new Error (`name: ${name} is not claimed before define`)
    )
    exp.check (t, this.ctx) .match ({
      ok: _value => {},
      err: error => {
        new Error (
          `type check fail for name: ${name}, error: ${error}`
        )
      }
    })
    this.env = this.env.ext (name, exp.eval (this.env))
    return this
  }

  run (exp: exp_t): result_t <exp_t, string> {
    return exp.synth (this.ctx) .match ({
      ok: t => {
        let normal_exp = read_back (
          this.used_names, t, exp.eval (this.env)
        )
        return new ok_t (
          new the_t (t, normal_exp)
        )
      },
      err: error => {
        return new err_t (
          `type synth fail for name: ${name}, error: ${error}`
        )
      },
    })
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
  neutral_tag: "neutral_t" = "neutral_t"

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
}

export
class neutral_apply_t extends neutral_t {
  rator: neutral_t
  rand: the_value_t

  constructor (
    rator: neutral_t,
    rand: the_value_t,
  ) {
    super ()
    this.rator = rator
    this.rand = rand
  }
}

export
class neutral_rec_nat_t extends neutral_t {
  t: type_t
  target: neutral_t
  base: the_value_t
  step: the_value_t

  constructor (
    t: type_t,
    target: neutral_t,
    base: the_value_t,
    step: the_value_t,
  ) {
    super ()
    this.t = t
    this.target = target
    this.base = base
    this.step = step
  }
}

export
function read_back (
  used_names: Set <string>,
  t: type_t,
  value: value_t,
): exp_t {
  if (t instanceof nat_t) {
    if (value instanceof zero_value_t) {
      return new zero_t ()
    } else if (value instanceof add1_value_t) {
      return new add1_t (
        read_back (
          used_names,
          new nat_t (),
          value.prev,
        )
      )
    } else if (value instanceof the_neutral_t) {
      return read_back_neutral (
        used_names,
        value.neutral,
      )
    } else {
      throw new Error (
        `unknown value of nat_t read_back`
      )
    }
  } else if (t instanceof arrow_t) {
    let fresh_name = freshen (used_names, "$")
    return new lambda_t (
      fresh_name, read_back (
        new Set (used_names) .add (fresh_name),
        t.ret,
        closure_t.exe (
          value,
          new the_neutral_t (
            t.arg,
            new neutral_var_t (fresh_name),
          )
        )
      )
    )
  } else {
    throw new Error (
      `unknown type to read_back: ${t.constructor.name}`
    )
  }
}

export
function read_back_neutral (
  used_names: Set <string>,
  neutral: neutral_t,
): exp_t {
  if (neutral instanceof neutral_var_t) {
    return new var_t (neutral.name)
  } else if (neutral instanceof neutral_apply_t) {
    let fun = neutral.rator
    let arg = neutral.rand
    return new apply_t (
      read_back_neutral (used_names, fun),
      read_back (used_names, arg.t, arg.value),
    )
  } else if (neutral instanceof neutral_rec_nat_t) {
    let base = neutral.base
    let step = neutral.step
    return new rec_nat_t (
      neutral.t,
      read_back_neutral (used_names, neutral.target),
      read_back (used_names, base.t, base.value),
      read_back (used_names, step.t, step.value),
    )
  } else {
    throw new Error (
      `unknown neutral read_back_neutral: ${neutral.constructor.name}`
    )
  }
}

export
abstract class type_t {
  type_tag: "type_t" = "type_t"
  abstract eq (that: type_t): boolean
}

export
class nat_t extends type_t {
  constructor () {
    super ()
  }

  eq (that: type_t): boolean {
    return that instanceof nat_t
  }
}

export
class arrow_t extends type_t {
  arg: type_t
  ret: type_t

  constructor (
    arg: type_t,
    ret: type_t,
  ) {
    super ()
    this.arg = arg
    this.ret = ret
  }

  eq (that: type_t): boolean {
    return that instanceof arrow_t
      && this.arg.eq (that.arg)
      && this.ret.eq (that.ret)
  }
}

export
class the_t extends exp_t {
  t: type_t
  exp: exp_t

  constructor (
    t: type_t,
    exp: exp_t,
  ) {
    super ()
    this.t = t
    this.exp = exp
  }

  eq (that: exp_t): boolean {
    return that instanceof the_t
      && this.t.eq (that.t)
      && this.exp.eq (that.exp)
  }

  eval (env: env_t = new env_t ()): value_t {
    return this.exp.eval (env)
  }

  /*
    ctx :- e <= A
    -----------------
    ctx :- e: A => A
  */
  synth (ctx: ctx_t): result_t <type_t, string> {
    return result_t.pure (this.t)
  }
}

export
class rec_nat_t extends exp_t {
  t: type_t
  target: exp_t
  base: exp_t
  step: exp_t

  constructor (
    t: type_t,
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

  eq (that: exp_t): boolean {
    return that instanceof rec_nat_t
      && this.t.eq (that.t)
      && this.target.eq (that.target)
      && this.base.eq (that.base)
      && this.step.eq (that.step)
  }

  static exe (
    t: type_t,
    target: value_t,
    base: value_t,
    step: value_t,
  ): value_t {
    if (target instanceof zero_value_t) {
      return base
    } else if (target instanceof add1_value_t) {
      return closure_t.exe (
        closure_t.exe (step, target.prev),
        rec_nat_t.exe (
          t,
          target.prev,
          base,
          step,
        )
      )
    } else if (target instanceof the_neutral_t) {
      if (target.t instanceof nat_t) {
        return new the_neutral_t (
          t, new neutral_rec_nat_t (
            t,
            target.neutral,
            new the_value_t (t, base),
            new the_value_t (
              new arrow_t (
                new nat_t (),
                new arrow_t (t, t)),
              step),
          )
        )
      } else {
        throw new Error (
          `type of the neutral fun is not nat_t`
        )
      }
    } else {
      throw new Error (
        `unknown target value: ${target}`
      )
    }
  }

  eval (env: env_t = new env_t ()): value_t {
    return rec_nat_t.exe (
      this.t,
      this.target.eval (env),
      this.base.eval (env),
      this.step.eval (env),
    )
  }

  /*
    ctx :- n <= Nat
    ctx :- b => A
    ctx :- s => Nat -> A -> A
    -----------------------------------
    ctx :- rec [A] (n, b, s) => A
  */

  synth (ctx: ctx_t): result_t <type_t, string> {
    return this.target.synth (ctx)
      .bind (target_type => {
        if (target_type.eq (new nat_t ())) {
          return this.base.check (this.t, ctx)
            .bind (__ => {
              return this.step.check (
                new arrow_t (
                  new nat_t, new arrow_t (this.t, this.t)
                ),
                ctx,
              )
            }) .bind (__ => {
              return result_t.pure (this.t)
            })
        } else {
          return new err_t (
            "target type is not nat_t"
          )
        }
      })
  }
}

export
class zero_t extends exp_t {
  constructor () {
    super ()
  }

  eq (that: exp_t): boolean {
    return that instanceof zero_t
  }

  eval (env: env_t = new env_t ()): value_t {
    return new zero_value_t ()
  }

  /*
    -------------------
    ctx :- zero <= Nat
  */

  check (t: type_t, ctx: ctx_t = new ctx_t ()): result_t <"ok", string> {
    if (t.eq (new nat_t ())) {
      return result_t.pure ("ok")
    } else {
      return new err_t (
        "the type of zero should be nat_t"
      )
    }
  }
}

export
class add1_t extends exp_t {
  prev: exp_t

  constructor (prev: exp_t) {
    super ()
    this.prev = prev
  }

  eq (that: exp_t): boolean {
    return that instanceof add1_t
      && this.prev.eq (that.prev)
  }

  eval (env: env_t = new env_t ()): value_t {
    return new add1_value_t (
      this.prev.eval (env)
    )
  }

  /*
    ctx :- n <= Nat
    -------------------
    ctx :- add1 (n) <= Nat
  */

  check (t: type_t, ctx: ctx_t = new ctx_t ()): result_t <"ok", string> {
    if (t.eq (new nat_t ())) {
      return this.prev.check (t, ctx)
    } else {
      return new err_t (
        "the type of add1_t should be nat_t"
      )
    }
  }
}
