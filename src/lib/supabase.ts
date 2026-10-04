import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const supabase = client
  ? new Proxy(client, {
      get(target, property, receiver) {
        if (property === "from") {
          return (table: string) => {
            const builder = target.from(table);

            if (table !== "products") {
              return builder;
            }

            const originalSelect = builder.select.bind(builder);

            return new Proxy(builder, {
              get(builderTarget, builderProperty, builderReceiver) {
                if (builderProperty === "select") {
                  return (columns?: string, options?: unknown) => {
                    const fixedColumns =
                      typeof columns === "string"
                        ? columns.replace(
                            /(^|,\s*)productNumber(?=\s*(,|$))/g,
                            "$1productNumber:product_number"
                          )
                        : columns;

                    return originalSelect(
                      fixedColumns as never,
                      options as never
                    );
                  };
                }

                return Reflect.get(
                  builderTarget,
                  builderProperty,
                  builderReceiver
                );
              },
            });
          };
        }

        return Reflect.get(target, property, receiver);
      },
    })
  : null;
