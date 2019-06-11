import test from "ava"
import * as ut from "cicada-lang/lib/util"
import { result_t, ok_t, err_t } from "cicada-lang/lib/result"
import * as cc from "../lib/system-T/core"
import {
  MODULE,
  VAR, LAMBDA, APPLY,
  ZERO, ADD1, THE, REC_NAT,
  NAT, ARROW,
} from "../lib/system-T/syntax"

test ("exp.eval", t => {
  LAMBDA (
    "x", LAMBDA (
      "y", VAR ("y")
    )
  ) .eval ()

  APPLY (
    LAMBDA ("x", VAR ("x")),
    LAMBDA ("x", VAR ("x")),
  ) .eval ()

  t.pass ()
})

test ("freshen", t => {
  let x = "x"

  t.deepEqual (
    cc.freshen (new Set (["x", "x*"]), x),
    "x**",
  )

  t.pass ()
})

test ("exp.infer", t => {
  let ctx = new cc.ctx_t ()
    .ext ("x", NAT)

  t.deepEqual (
    VAR ("x") .infer (ctx),
    new ok_t (NAT),
  )
})

test ("exp.check", t => {
  t.deepEqual (
    ZERO .check (NAT),
    new ok_t ("ok"),
  )

  t.deepEqual (
    ADD1 (ZERO) .check (NAT),
    new ok_t ("ok"),
  )

  t.deepEqual (
    LAMBDA ("x", VAR ("x")) .check (ARROW (NAT, NAT)),
    new ok_t ("ok"),
  )

  t.deepEqual (
    LAMBDA (
      "j", LAMBDA (
        "k", REC_NAT (
          NAT, VAR ("j"), VAR ("k"),
          LAMBDA (
            "prev", LAMBDA (
              "sum", ADD1 (VAR ("sum"))
            )
          )
        )
      )
    ) .check (ARROW (NAT, ARROW (NAT, NAT))),
    new ok_t ("ok"),
  )

  t.pass ()
})

test ("module.define", t => {
  let m = MODULE ()

  m.claim (
    "three",
    NAT,
  )
  m.define (
    "three",
    ADD1 (ADD1 (ADD1 (ZERO)))
  )

  m.claim (
    "+",
    ARROW (NAT, ARROW (NAT, NAT))
  )
  m.define (
    "+",
    LAMBDA (
      "n", LAMBDA (
        "k", REC_NAT (
          NAT, VAR ("n"), VAR ("k"),
          LAMBDA (
            "prev", LAMBDA (
              "almost",
              ADD1 (VAR ("almost")),
            )
          )
        )
      )
    )
  )

  ut.log (
    m.run (
      APPLY (VAR ("+"), VAR ("three"))
    )
  )

  ut.log (
    m.run (
      APPLY (APPLY (VAR ("+"), VAR ("three")), VAR ("three"))
    )
  )

  t.pass ()
})
