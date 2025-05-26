
bun format
bun lint --fix
cargo fmt --manifest-path ./src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path ./src-tauri/Cargo.toml --all-targets --all-features -- -D warnings