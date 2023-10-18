\echo 'Delete and recreate juntas db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE juntas-db;
CREATE DATABASE juntas-db;
\connect juntas-db

\i juntas-schema.sql
\i juntas-seed.sql

\echo 'Delete and recreate juntas_test db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE juntas_test;
CREATE DATABASE juntas_test;
\connect juntas_test

\i juntas-schema.sql

