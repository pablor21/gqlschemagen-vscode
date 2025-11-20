package main

type TestStruct struct {
	Field1 string `gql:"field1,required"`
	Field2 int    `gql:"field2,ro"`
}
