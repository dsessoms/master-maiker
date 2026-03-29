# Code Standards

- Never user `any` unless there is absolutely no alternative (this is very rare). If you must you `any` you must give a clear description as to why you couldn't create and use proper types.

# Project Structure

- /app                    # root folder of expo router, each file is a page
- /components             # components split by feature
- /components/ui          # common components used across features (relies heavily on react-native-reusables)
