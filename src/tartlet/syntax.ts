import * as cc from "./core"

export let MODULE = (
  ctx: cc.ctx_t = new cc.ctx_t (),
) => new cc.module_t (ctx)

export let VAR = (
  name: string,
) => new cc.exp_var_t (name)

export let PI = (
  name: string,
  arg_type: cc.exp_t,
  ret_type: cc.exp_t,
) => new cc.exp_pi_t (name, arg_type, ret_type)

export let ARROW = (
  arg_type: cc.exp_t,
  ret_type: cc.exp_t,
) => new cc.exp_pi_t ("_arg", arg_type, ret_type)

export let LAMBDA = (
  name: string,
  body: cc.exp_t,
) => new cc.exp_lambda_t (name, body)

export let APPLY = (
  rator: cc.exp_t,
  rand: cc.exp_t,
) => new cc.exp_apply_t (rator, rand)

export let SIGMA = (
  name: string,
  car_type: cc.exp_t,
  cdr_type: cc.exp_t,
) => new cc.exp_sigma_t (name, car_type, cdr_type)

export let PAIR = (
  car_type: cc.exp_t,
  cdr_type: cc.exp_t,
) => new cc.exp_sigma_t ("_car", car_type, cdr_type)

export let CONS = (
  car: cc.exp_t,
  cdr: cc.exp_t,
) => new cc.exp_cons_t (car, cdr)

export let CAR = (
  pair: cc.exp_t,
) => new cc.exp_car_t (pair)

export let CDR = (
  pair: cc.exp_t,
) => new cc.exp_cdr_t (pair)

export let NAT = new cc.exp_nat_t ()

export let ZERO = new cc.exp_zero_t ()

export let ADD1 = (
  prev: cc.exp_t,
) => new cc.exp_add1_t (prev)

export let IND_NAT = (
  target: cc.exp_t,
  motive: cc.exp_t,
  base: cc.exp_t,
  step: cc.exp_t,
) => new cc.exp_ind_nat_t (target, motive, base, step)

export let EQV = (
  t: cc.exp_t,
  from: cc.exp_t,
  to: cc.exp_t,
) => new cc.exp_eqv_t (t, from, to)

export let SAME = new cc.exp_same_t ()

export let REPLACE = (
  target: cc.exp_t,
  motive: cc.exp_t,
  base: cc.exp_t,
) => new cc.exp_replace_t (target, motive, base)

export let TRIVIAL = new cc.exp_trivial_t ()

export let SOLE = new cc.exp_sole_t ()

export let ABSURD = new cc.exp_absurd_t ()

export let IND_ABSURD = (
  target: cc.exp_t,
  motive: cc.exp_t,
) => new cc.exp_ind_absurd_t (target, motive)

export let ATOM = new cc.exp_atom_t ()

export let QUOTE = (
  sym: string,
) => new cc.exp_quote_t (sym)

export let UNIVERSE = new cc.exp_universe_t ()

export let THE = (
  t: cc.exp_t,
  value: cc.exp_t,
) => new cc.exp_the_t (t, value)
