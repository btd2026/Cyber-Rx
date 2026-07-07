{
  "targets": [
    {
      "target_name": "license_native",
      "sources": [ "src/license_native.c" ],
      "cflags": [ "-fvisibility=hidden", "-O2" ],
      "cflags_c": [ "-std=c11" ],
      "defines": [ "NAPI_VERSION=8" ],
      "conditions": [
        [ "OS=='linux'", {
          "libraries": [ "-Wl,--no-as-needed" ]
        } ]
      ]
    }
  ]
}
