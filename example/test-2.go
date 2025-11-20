package main

import "time"

/**
* @gqlEnum(name:"UserRole")
**/
type UserRole string

const (
	UserRoleAdmin    UserRole = "admin"
	UserRoleStandard UserRole = "standard" // @gqlEnumValue(deprecated:"Use 'user' instead")
	UserRoleUser     UserRole = "user"
)

/**
* @GqlType
* @GqlInput(name:"UserCreateInput")
* @GqlInput(name:"UserUpdateInput")
**/
type User2 struct {
	ID           string    `gql:",optional,include"`
	Email        string    `db:"email" json:"email" gql:",include:[User2],optional"`
	Name         string    `db:"name" json:"name" gql:",optional,include"`
	PasswordHash string    `db:"password_hash" json:"-"`
	Role         UserRole  `db:"role" json:"role" gql:",required,include"`
	CreatedAt    time.Time `db:"created_at" json:"createdAt" gql:",optional,include,type:Time"`
	UpdatedAt    time.Time `db:"updated_at" json:"updatedAt" gql:",optional,include,type:Time"`
}
